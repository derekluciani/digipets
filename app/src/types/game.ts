export type PetId = string;

export const PetType = {
    Fox: "Fox",
} as const;

export type PetType = (typeof PetType)[keyof typeof PetType];

export const PetStatus = {
    Idle: "Idle",
    Eating: "Eating",
    Pooping: "Pooping",
    Playing: "Playing",
    Sleeping: "Sleeping",
    Vomiting: "Vomiting",
    Dancing: "Dancing",
    Dead: "Dead",
} as const;

export type PetStatus = (typeof PetStatus)[keyof typeof PetStatus];

export const CauseOfDeath = {
    OldAge: "OldAge",
    Sickness: "Sickness", // Health <= 0
    Starvation: "Starvation", // Hunger = 100 for too long
    Depression: "Depression", // Mood <= 10 for too long
} as const;

export type CauseOfDeath = (typeof CauseOfDeath)[keyof typeof CauseOfDeath];

export const PetPhase = {
    Baby: "Baby",
    Toddler: "Toddler",
    Teen: "Teen",
    Adult: "Adult",
    Special: "Special",
} as const;

export type PetPhase = (typeof PetPhase)[keyof typeof PetPhase];

export interface PetState {
    // Metadata
    id: PetId;
    petType: PetType;
    lifeExpectancy: number; // Game years
    name: string;
    birthday: number; // Timestamp (ms)
    lastSimulatedAt: number; // Timestamp (ms)

    // Status
    phase: PetPhase;
    status: PetStatus;
    causeOfDeath?: CauseOfDeath;

    // Vitals (0-100)
    age: number; // Game years (increments every day)
    hunger: number;
    mood: number;
    energy: number;
    weight: number;
    healthPoints: number;

    // Flags
    isSpecial: boolean;
    isSick: boolean;
    isDirty: boolean;
    isDead: boolean;

    // Counters
    currentPoopCount: number;
    lifetimePoops: number;
    mealsSincePoop: number;
    penaltyCount: number;

    // Timers (Minutes)
    minuteOfDay: number; // 0..1439
    ageTime: number; // towards next age
    starvingTime: number;
    hungerTime: number; // too full
    moodTime: number; // too low
    fitnessTime: number; // playing (lifetime aggregate)
    responseTime: number; // whining (lifetime aggregate)
    dirtyTime: number;
    sickTime: number;
    sleepTime: number;
    eatingTime: number;
    poopTime: number;
    vomitTime: number;
    offlineTime: number; // real time seconds

    // Settings
    isRadioPlaying: boolean;
    isMusicPlaying: boolean;

    // Derived
    caretakerScore: number;
}

export interface PlayerState {
    achievements: string[]; // List of achievement IDs
    settings: {
        // potentially map string -> any
        [key: string]: unknown;
    };
}

export interface GameState {
    pets: Record<PetId, PetState>;
    activePetId: PetId | null;
    player: PlayerState;
}
