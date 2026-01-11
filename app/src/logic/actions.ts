import { type PetState, PetStatus } from "../types/game";
import { GAME_CONSTANTS } from "../constants";

/**
 * Feeds a pet, updating its hunger, weight, mood, and energy.
 */
export function feed(pet: PetState): PetState {
    if (pet.status === PetStatus.Dead || pet.status === PetStatus.Sleeping) return pet;
    if (pet.hunger <= 0) return pet;

    const newHunger = Math.max(0, pet.hunger - 10);
    const newWeight = Math.min(GAME_CONSTANTS.MAX_WEIGHT, pet.weight + 10);
    const newMood = Math.min(GAME_CONSTANTS.MAX_MOOD, pet.mood + 5);
    const newEnergy = Math.min(GAME_CONSTANTS.MAX_ENERGY, pet.energy + 5);

    return {
        ...pet,
        status: PetStatus.Eating,
        eatingTime: 0,
        hunger: newHunger,
        weight: newWeight,
        mood: newMood,
        energy: newEnergy,
        mealsSincePoop: pet.mealsSincePoop + 1,
    };
}

/**
 * Initiates play with a pet if it has enough energy.
 * Toggles off playing if already playing.
 */
export function play(pet: PetState): PetState {
    if (pet.status === PetStatus.Dead || pet.status === PetStatus.Sleeping) return pet;

    // Toggle off if already playing
    if (pet.status === PetStatus.Playing) {
        return {
            ...pet,
            status: PetStatus.Idle,
        };
    }

    if (pet.energy <= 33) return pet;

    return {
        ...pet,
        status: PetStatus.Playing,
    };
}

/**
 * Toggles sleep status. 
 * Waking up sets status to Idle. 
 * Going to sleep updates stats and can cure sickness if clean.
 */
export function sleep(pet: PetState): PetState {
    if (pet.status === PetStatus.Dead) return pet;

    if (pet.status === PetStatus.Sleeping) {
        return { ...pet, status: PetStatus.Idle };
    }

    return {
        ...pet,
        status: PetStatus.Sleeping,
        weight: Math.max(0, pet.weight - 5),
        mood: Math.min(GAME_CONSTANTS.MAX_MOOD, pet.mood + 15),
        // Cure sickness if clean
        isSick: pet.isSick && !pet.isDirty ? false : pet.isSick,
        sickTime: pet.isSick && !pet.isDirty ? 0 : pet.sickTime,
    };
}

/**
 * Cleans the pet, removing mess and improving mood.
 */
export function clean(pet: PetState): PetState {
    if (pet.status === PetStatus.Dead) return pet;

    return {
        ...pet,
        currentPoopCount: 0,
        isDirty: false,
        dirtyTime: 0,
        mood: Math.min(GAME_CONSTANTS.MAX_MOOD, pet.mood + 10),
    };
}

/**
 * Toggles the radio.
 * If music starts and pet is Idle, pet starts Dancing.
 * If music stops and pet is Dancing, pet becomes Idle.
 */
export function toggleRadio(pet: PetState): PetState {
    if (pet.status === PetStatus.Dead) return pet;

    const isPlaying = !pet.isRadioPlaying;

    let newStatus = pet.status;
    if (isPlaying && pet.status === PetStatus.Idle) {
        newStatus = PetStatus.Dancing;
    } else if (!isPlaying && pet.status === PetStatus.Dancing) {
        newStatus = PetStatus.Idle;
    }

    return {
        ...pet,
        isRadioPlaying: isPlaying,
        status: newStatus,
    };
}
