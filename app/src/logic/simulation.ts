import { type PetState, PetStatus } from "../types/game";
import { GAME_CONSTANTS } from "../constants";
import { computeCaretakerScore, qualifiesForSpecialPhase, type CaretakerScoreInputs } from "./caretakerScore";

/**
 * Helpers
 */
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Determine Life Phase based on age (years) and life expectancy (years)
 */

// Phase thresholds from PRD
// 1 Baby: < ceil(L/4)
// 2 Toddler: ceil(L/4) <= age < ceil(L/2)
// 3 Teen: ceil(L/2) <= age < ceil(3*L/4)
// 4 Adult: age >= ceil(3*L/4)



/**
 * Simulator: Process 1 Game Minute
 */
export function simulateOneMinute(pet: PetState): PetState {
    if (pet.isDead) return pet;

    const next = { ...pet };

    // 1. Time Advancement
    next.minuteOfDay = (next.minuteOfDay + 1) % GAME_CONSTANTS.MINUTES_PER_DAY;
    next.ageTime += 1;

    // Day/Life Cycle
    // 1 Game Day = 1 Pet Year = 1440 minutes
    if (next.ageTime >= GAME_CONSTANTS.MINUTES_PER_DAY) {
        next.age += 1;
        next.ageTime = 0; // Reset daily counter

        // Check Special Phase / Death at Start of new year/day? 
        // PRD: "At the end of the 'Adult' phase (when age reaches L)"

        if (next.age >= next.lifeExpectancy && !next.isSpecial) {
            // Check for Special Phase or Death
            const inputs: CaretakerScoreInputs = {
                mood: next.mood,
                hunger: next.hunger,
                healthPoints: next.healthPoints,
                fitnessTime: next.fitnessTime,
                responseTime: next.responseTime,
                lifeExpectancy: next.lifeExpectancy
            };
            const { caretakerScore } = computeCaretakerScore(inputs);
            next.caretakerScore = caretakerScore; // Update stored score

            if (qualifiesForSpecialPhase(caretakerScore)) {
                next.isSpecial = true;
                next.lifeExpectancy += 5; // Bonus years
            } else {
                next.isDead = true;
                next.status = PetStatus.Dead;
                return next; // Stop processing if dead
            }
        } else if (next.isSpecial && next.age >= next.lifeExpectancy) {
            // End of extended life
            next.isDead = true;
            next.status = PetStatus.Dead;
            return next;
        }
    }

    // 2. Incremental Timers

    // Starvation: hunger >= 90
    if (next.hunger >= GAME_CONSTANTS.HUNGER_STARVING) {
        next.starvingTime += 1;
    } else {
        next.starvingTime = 0;
    }

    // Overfeeding: hunger <= 10
    if (next.hunger <= GAME_CONSTANTS.HUNGER_FULL) {
        next.hungerTime += 1;
    } else {
        next.hungerTime = 0;
    }

    // Mood: <= 10
    if (next.mood <= GAME_CONSTANTS.MOOD_LOW) {
        next.moodTime += 1;
    } else {
        next.moodTime = 0;
    }

    // Fitness (Playing)
    if (next.status === PetStatus.Playing) {
        next.fitnessTime += 1;
    }

    // Dirty
    if (next.isDirty) {
        next.dirtyTime += 1;
    } else {
        next.dirtyTime = 0;
    }

    // Sick
    if (next.isSick) {
        next.sickTime += 1;
    } else {
        next.sickTime = 0;
    }

    // Sleep
    if (next.status === PetStatus.Sleeping) {
        next.sleepTime += 1;
    } else {
        next.sleepTime = 0;
    }

    // Whining / Response Time
    // isWhining definition: hunger >= 90 OR energy <= 10 OR (mood == 0 && moodTime >= 180) OR mood <= 10
    const isWhining =
        next.hunger >= GAME_CONSTANTS.HUNGER_STARVING ||
        next.energy <= GAME_CONSTANTS.MOOD_LOW || // Using 10 as generic low threshold
        (next.mood === 0 && next.moodTime >= GAME_CONSTANTS.MOOD_ANGRY_TIME) ||
        next.mood <= GAME_CONSTANTS.MOOD_LOW;

    if (isWhining) {
        next.responseTime += 1;
    }

    // 3. Hourly Trigger (Decay & Neglect)
    // Check if we just completed an hour block (minuteOfDay % 60 === 0)
    // Note: minuteOfDay starts at 0. So 0->1... at 60 it is 1 hour passed? 
    // Let's say trigger on minuteOfDay % 60 === 0.

    if (next.minuteOfDay % GAME_CONSTANTS.DECAY_INTERVAL === 0) {
        applyHourlyLogic(next);
    }

    // 4. Auto-Wake / Sleep Logic? (PRD says Sleep 60m Day / 360m Night).
    // This implies Sleep status has a duration.
    // We need to track how long they've been sleeping.
    if (next.status === PetStatus.Sleeping) {
        const isNight = next.minuteOfDay >= GAME_CONSTANTS.DAY_PHASE_LIMIT;
        const sleepDuration = isNight ? 360 : 60;
        if (next.sleepTime >= sleepDuration) {
            next.status = PetStatus.Idle;
            next.sleepTime = 0;
        }
    }

    // 5. Playing Auto-Stop
    if (next.status === PetStatus.Playing && next.energy <= 33) {
        next.status = PetStatus.Idle;
    }

    // 6. Death Conditions (Constant Check)
    checkDeath(next);

    return next;
}

function applyHourlyLogic(pet: PetState) {
    // Decay
    // Condition: NOT Sleeping or Dead
    if (pet.status !== PetStatus.Sleeping && pet.status !== PetStatus.Dead) {
        pet.hunger = clamp(pet.hunger + 1, 0, GAME_CONSTANTS.MAX_HUNGER);
        pet.energy = clamp(pet.energy - 1, 0, GAME_CONSTANTS.MAX_ENERGY);
        pet.mood = clamp(pet.mood - 1, 0, GAME_CONSTANTS.MAX_MOOD);

        // Dancing Specifics (per hour)
        if (pet.status === PetStatus.Dancing) {
            pet.hunger = clamp(pet.hunger + 5, 0, GAME_CONSTANTS.MAX_HUNGER);
            pet.weight = clamp(pet.weight - 1, 0, GAME_CONSTANTS.MAX_WEIGHT);
            pet.mood = clamp(pet.mood + 5, 0, GAME_CONSTANTS.MAX_MOOD);
            pet.energy = clamp(pet.energy - 5, 0, GAME_CONSTANTS.MAX_ENERGY);
        }
    }

    // Health Neglect
    let penalties = 0;

    // 1. Starvation
    if (pet.starvingTime >= 180 || pet.hunger === 100) penalties++;

    // 2. Overfeeding
    else if (pet.hungerTime >= 180) penalties++;

    // 3. Sickness
    else if (pet.status === PetStatus.Vomiting || pet.sickTime >= 180) penalties++;

    // 4. Hygiene
    else if (pet.dirtyTime >= 180) penalties++;

    // 5. Emotional
    // isAngry: mood == 0 && moodTime >= 180
    else if (pet.mood === 0 && pet.moodTime >= 180) penalties++;

    // 6. Weight
    else if (pet.weight === 0 || pet.weight === 100) penalties++;

    pet.penaltyCount += penalties;
    pet.healthPoints = clamp(pet.healthPoints - penalties, 0, GAME_CONSTANTS.MAX_HEALTH);

    // Recovery
    if (penalties === 0) {
        pet.healthPoints = clamp(pet.healthPoints + 1, 0, GAME_CONSTANTS.MAX_HEALTH);
    }
}

function checkDeath(pet: PetState) {
    if (pet.isDead) return;

    // 1. Health Points <= 0
    if (pet.healthPoints <= 0) {
        pet.isDead = true;
        pet.status = PetStatus.Dead;
        return;
    }

    // 2. Hunger = 100 for >= 720 mins
    // We need to track excessive time? 
    // "hunger = 100 for >= 720 game minutes"
    // Using starvingTime (which tracks hunger >= 90). The PRD condition is distinct. 
    // But starvingTime is reset if hunger < 90. Logic might accept starvingTime if hunger is pinned at 100?
    // PRD specifies exactly hunger=100. Let's assume starvingTime tracks this broadly, 
    // or we need a specific timer. For simplicity, if starvingTime reaches 720 AND hunger is 100, kill.
    if (pet.hunger === 100 && pet.starvingTime >= 720) {
        pet.isDead = true;
        pet.status = PetStatus.Dead;
        return;
    }

    // 3. Mood <= 10 for >= 720 mins
    // moodTime tracks mood <= 10.
    if (pet.moodTime >= 720) {
        pet.isDead = true;
        pet.status = PetStatus.Dead;
        return;
    }
}
