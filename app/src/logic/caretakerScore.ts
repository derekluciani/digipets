/**
 * Caretaker Score (0–100)
 * Goal:
 * - Produce school-like results: <60 = F, >=90 = A.
 * - Preserve Special Phase gate: caretakerScore >= 95.
 *
 * Inputs:
 * - mood, hunger, healthPoints are already 0–100 vitals.
 * - fitnessTime: lifetime total exercise time (game minutes).
 * - responseTime: lifetime total time pet spent whining unresolved (game minutes).
 * - lifeExpectancy: pet lifespan in game years (10/15 today, may change later).
 *
 * Canonical Time Model:
 * - 1 Pet Year = 1 Game Day = 24 hours = 1440 game minutes.
 */
export type CaretakerScoreInputs = {
    mood: number; // 0–100
    hunger: number; // 0–100 (higher = worse)
    healthPoints: number; // 0–100
    fitnessTime: number; // lifetime total exercise minutes
    responseTime: number; // lifetime total whining-unresolved minutes
    lifeExpectancy: number; // game years
};

export type CaretakerScoreConfig = {
    minutesPerYear: number;

    // Weighted average (must sum to 1.0)
    weights: {
        mood: number;
        hungerInverted: number;
        healthPoints: number;
        fitness: number;
        attention: number;
    };

    // Fitness scoring curve based on % of lifetime spent exercising
    fitnessCurve: {
        fitnessRatioPass: number; // e.g. 0.02 = 2% of life => score 60
        fitnessRatioExcellent: number; // e.g. 0.08 = 8% of life => score 100
    };

    // Attention scoring curve based on % of lifetime spent whining unresolved
    attentionCurve: {
        rExcellent: number; // e.g. 0.005 = 0.5% of life => 100
        rPass: number; // e.g. 0.05  = 5% of life  => 60
        rFail: number; // e.g. 0.15  = 15% of life => 0
    };
};

const DEFAULT_CONFIG: CaretakerScoreConfig = {
    // 1 Pet Year = 1 Game Day = 1440 game minutes
    minutesPerYear: 1440,

    // Tuned so A (>=90) requires consistently strong care,
    // and Special (>=95) is a notable achievement.
    weights: {
        mood: 0.25,
        hungerInverted: 0.25,
        healthPoints: 0.2,
        fitness: 0.15,
        attention: 0.15,
    },

    // Fitness: % of life exercising
    // - 2% of life exercising => ~60 (passing)
    // - 8% of life exercising => 100 (excellent)
    fitnessCurve: {
        fitnessRatioPass: 0.02,
        fitnessRatioExcellent: 0.08,
    },

    // Attention: % of life spent whining unresolved (lower is better)
    // - 0.5% of life whining => 100
    // - 5%   of life whining => 60
    // - 15%+ of life whining => 0
    attentionCurve: {
        rExcellent: 0.005,
        rPass: 0.05,
        rFail: 0.15,
    },
};

const clamp = (n: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, n));
const clamp100 = (n: number) => clamp(Number.isFinite(n) ? n : 0, 0, 100);

/**
 * FitnessScore (0–100) from lifetime total exercise minutes.
 * Scales with lifespan so it stays fair if lifeExpectancy changes.
 */
function fitnessScoreFromTotalMinutes(
    fitnessTime: number,
    totalLifeMinutes: number,
    curve: CaretakerScoreConfig["fitnessCurve"],
): number {
    if (totalLifeMinutes <= 0) return 0;

    const ratio = clamp(fitnessTime / totalLifeMinutes, 0, 1); // 0..1
    const pass = curve.fitnessRatioPass;
    const excellent = curve.fitnessRatioExcellent;

    if (ratio <= 0) return 0;
    if (ratio >= excellent) return 100;

    // 0..pass => 0..60
    if (ratio <= pass) {
        const t = ratio / pass; // 0..1
        return Math.round(60 * t);
    }

    // pass..excellent => 60..100
    const t = (ratio - pass) / (excellent - pass); // 0..1
    return Math.round(60 + 40 * t);
}

/**
 * AttentionScore (0–100) from lifetime total whining-unresolved minutes.
 * Uses % of life spent whining, so it stays fair across different lifespans.
 */
function attentionScoreFromTotalMinutes(
    responseTime: number,
    totalLifeMinutes: number,
    curve: CaretakerScoreConfig["attentionCurve"],
): number {
    if (totalLifeMinutes <= 0) return 0;

    const ratio = clamp(responseTime / totalLifeMinutes, 0, 1); // 0..1 (lower is better)
    const { rExcellent, rPass, rFail } = curve;

    if (ratio <= rExcellent) return 100;
    if (ratio >= rFail) return 0;

    // rExcellent..rPass => 100..60
    if (ratio <= rPass) {
        const t = (ratio - rExcellent) / (rPass - rExcellent); // 0..1
        return Math.round(100 - 40 * t);
    }

    // rPass..rFail => 60..0
    const t = (ratio - rPass) / (rFail - rPass); // 0..1
    return Math.round(60 * (1 - t));
}

/**
 * Primary scoring function.
 * Returns:
 * - caretakerScore: integer 0–100
 * - breakdown subscores (useful for debugging / balancing)
 */
export function computeCaretakerScore(
    s: CaretakerScoreInputs,
    cfg: CaretakerScoreConfig = DEFAULT_CONFIG,
): {
    caretakerScore: number;
    subscores: {
        hungerInverted: number;
        fitnessScore: number;
        attentionScore: number;
    };
} {
    const mood = clamp100(s.mood);
    const hunger = clamp100(s.hunger);
    const healthPoints = clamp100(s.healthPoints);

    // Hunger inverted per PRD note: (100 - currentHunger)
    const hungerInverted = clamp100(100 - hunger);

    // Total life minutes from canonical time model:
    const totalLifeMinutes = Math.max(0, s.lifeExpectancy) * cfg.minutesPerYear;

    const fitnessScore = clamp100(
        fitnessScoreFromTotalMinutes(
            s.fitnessTime,
            totalLifeMinutes,
            cfg.fitnessCurve,
        ),
    );

    const attentionScore = clamp100(
        attentionScoreFromTotalMinutes(
            s.responseTime,
            totalLifeMinutes,
            cfg.attentionCurve,
        ),
    );

    const w = cfg.weights;

    // Weighted average in 0..100 space
    const raw =
        w.mood * mood +
        w.hungerInverted * hungerInverted +
        w.healthPoints * healthPoints +
        w.fitness * fitnessScore +
        w.attention * attentionScore;

    const caretakerScore = Math.round(clamp100(raw));

    return {
        caretakerScore,
        subscores: { hungerInverted, fitnessScore, attentionScore },
    };
}

/**
 * Letter grade helper.
 */
export function caretakerLetterGrade(
    score: number,
): "A" | "B" | "C" | "D" | "F" {
    const s = clamp100(score);
    if (s >= 90) return "A";
    if (s >= 80) return "B";
    if (s >= 70) return "C";
    if (s >= 60) return "D";
    return "F";
}

/**
 * Special Phase gate helper
 */
export function qualifiesForSpecialPhase(score: number): boolean {
    return clamp100(score) >= 95;
}
