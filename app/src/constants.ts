import { PetType } from "./types/game";

export const GAME_CONSTANTS = {
    MINUTES_PER_DAY: 1440,
    NIGHT_START_MINUTE: 1320, // 10:00 PM
    NIGHT_END_MINUTE: 360, // 6:00 AM
    DECAY_INTERVAL: 60, // Game minutes (1 hour)
    EATING_DURATION_MINUTES: 12,

    // Real time seconds per game minute
    REAL_SECONDS_PER_GAME_MINUTE: 0.25,

    // Limits
    MAX_HUNGER: 100,
    MAX_MOOD: 100,
    MAX_ENERGY: 100,
    MAX_WEIGHT: 100,
    MAX_HEALTH: 100,

    // Thresholds
    HUNGER_STARVING: 90,
    HUNGER_FULL: 10,
    MOOD_LOW: 10,
    MOOD_ANGRY_TIME: 180,
    MOOD_SAD: 33,
    MOOD_HAPPY: 68,

    POOP_TRIGGER_MEALS: 3,
    VOMIT_HUNGER_TIME: 180,
    SICK_MOOD_CURE: 34,

    // Life Expectancy
    LIFE_EXPECTANCY: {
        [PetType.Fox]: 10,
    },
};

export function isNightMinuteOfDay(minuteOfDay: number): boolean {
    const normalized = ((minuteOfDay % GAME_CONSTANTS.MINUTES_PER_DAY) + GAME_CONSTANTS.MINUTES_PER_DAY) % GAME_CONSTANTS.MINUTES_PER_DAY;
    return (
        normalized >= GAME_CONSTANTS.NIGHT_START_MINUTE ||
        normalized < GAME_CONSTANTS.NIGHT_END_MINUTE
    );
}
