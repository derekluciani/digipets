import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { type PetState, type PetType, PetStatus, type GameState } from "../types/game";
import { GAME_CONSTANTS } from "../constants";
import { simulateOneMinute } from "../logic/simulation";

interface PetStore extends GameState {
    // Actions
    createPet: (name: string, type: PetType) => void;
    setActivePet: (petId: string) => void;
    updatePet: (petId: string, updates: Partial<PetState>) => void;
    deletePet: (petId: string) => void;

    // Simulation
    processSimulationStep: (elapsedGameMinutes: number) => void;

    // User Actions
    feedPet: (petId: string) => void;
    playPet: (petId: string) => void;
    sleepPet: (petId: string) => void;
    cleanPet: (petId: string) => void;
    toggleRadio: (petId: string) => void;
}

const INITIAL_PET_STATE: Omit<PetState, "id" | "name" | "petType" | "lifeExpectancy" | "birthday" | "lastSimulatedAt"> = {
    status: PetStatus.Idle,

    // Vitals
    age: 0,
    hunger: 50,
    mood: 100,
    energy: 100,
    weight: 50,
    healthPoints: 100,

    // Flags
    isSpecial: false,
    isSick: false,
    isDirty: false,
    isDead: false,

    // Counters
    currentPoopCount: 0,
    lifetimePoops: 0,
    mealsSincePoop: 0,
    penaltyCount: 0,

    // Timers
    minuteOfDay: 480, // Start at 8 AM
    ageTime: 0,
    starvingTime: 0,
    hungerTime: 0,
    moodTime: 0,
    fitnessTime: 0,
    responseTime: 0,
    dirtyTime: 0,
    sickTime: 0,
    sleepTime: 0,
    offlineTime: 0,

    // Settings
    isRadioPlaying: false,
    isMusicPlaying: false,

    caretakerScore: 0,
};

export const usePetStore = create<PetStore>()(
    persist(
        (set) => ({
            pets: {},
            activePetId: null,
            player: {
                achievements: [],
                settings: {},
            },

            createPet: (name: string, type: PetType) => {
                const id = uuidv4();
                const lifeExpectancy = GAME_CONSTANTS.LIFE_EXPECTANCY[type];
                const now = Date.now();

                const newPet: PetState = {
                    id,
                    name,
                    petType: type,
                    lifeExpectancy,
                    birthday: now,
                    lastSimulatedAt: now,
                    ...INITIAL_PET_STATE,
                };

                set((state: PetStore) => ({
                    pets: { ...state.pets, [id]: newPet },
                    activePetId: id,
                }));
            },

            setActivePet: (petId: string) => {
                set({ activePetId: petId });
            },

            updatePet: (petId: string, updates: Partial<PetState>) => {
                set((state: PetStore) => ({
                    pets: {
                        ...state.pets,
                        [petId]: { ...state.pets[petId], ...updates },
                    },
                }));
            },

            deletePet: (petId: string) => {
                set((state: PetStore) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { [petId]: _, ...remainingPets } = state.pets;
                    return {
                        pets: remainingPets,
                        activePetId: state.activePetId === petId ? null : state.activePetId
                    };
                });
            },

            processSimulationStep: (_elapsedGameMinutes: number) => {
                set((state: PetStore) => {
                    if (!state.activePetId || !state.pets[state.activePetId]) return state;

                    const petId = state.activePetId;
                    let currentPet = { ...state.pets[petId] };

                    const now = Date.now();
                    const lastSim = currentPet.lastSimulatedAt || now;
                    const diffInMs = now - lastSim;
                    // Floor to ensure full minutes
                    const minutesToSimulate = Math.floor(diffInMs / (1000 * GAME_CONSTANTS.REAL_SECONDS_PER_GAME_MINUTE));

                    if (minutesToSimulate <= 0) return state;

                    const MAX_BATCH = 1440 * 2;
                    const steps = Math.min(minutesToSimulate, MAX_BATCH);

                    for (let i = 0; i < steps; i++) {
                        currentPet = simulateOneMinute(currentPet);
                        if (currentPet.isDead) break;
                    }

                    currentPet.lastSimulatedAt = now;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: currentPet,
                        },
                    };
                });
            },

            feedPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet || pet.status === PetStatus.Dead || pet.status === PetStatus.Sleeping) return state;

                    if (pet.hunger <= 0) return state;

                    const newHunger = Math.max(0, pet.hunger - 10);
                    const newWeight = Math.min(GAME_CONSTANTS.MAX_WEIGHT, pet.weight + 10);
                    const newMood = Math.min(GAME_CONSTANTS.MAX_MOOD, pet.mood + 5);
                    const newEnergy = Math.min(GAME_CONSTANTS.MAX_ENERGY, pet.energy + 5);

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: {
                                ...pet,
                                status: PetStatus.Eating,
                                hunger: newHunger,
                                weight: newWeight,
                                mood: newMood,
                                energy: newEnergy,
                                mealsSincePoop: pet.mealsSincePoop + 1,
                            }
                        }
                    };
                });
            },

            playPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet || pet.status === PetStatus.Dead || pet.status === PetStatus.Sleeping) return state;
                    if (pet.energy <= 33) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: {
                                ...pet,
                                status: PetStatus.Playing,
                            }
                        }
                    };
                });
            },

            sleepPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet || pet.status === PetStatus.Dead) return state;

                    if (pet.status === PetStatus.Sleeping) {
                        return {
                            pets: { ...state.pets, [petId]: { ...pet, status: PetStatus.Idle } }
                        };
                    }

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: {
                                ...pet,
                                status: PetStatus.Sleeping,
                                weight: Math.max(0, pet.weight - 5),
                                mood: Math.min(GAME_CONSTANTS.MAX_MOOD, pet.mood + 15),
                            }
                        }
                    };
                });
            },

            cleanPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet || pet.status === PetStatus.Dead) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: {
                                ...pet,
                                currentPoopCount: 0,
                                isDirty: false,
                                dirtyTime: 0,
                                mood: Math.min(GAME_CONSTANTS.MAX_MOOD, pet.mood + 10),
                            }
                        }
                    };
                });
            },

            toggleRadio: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet || pet.status === PetStatus.Dead) return state;

                    const isPlaying = !pet.isRadioPlaying;

                    let newStatus = pet.status;
                    if (isPlaying && pet.status === PetStatus.Idle) {
                        newStatus = PetStatus.Dancing;
                    } else if (!isPlaying && pet.status === PetStatus.Dancing) {
                        newStatus = PetStatus.Idle;
                    }

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: {
                                ...pet,
                                isRadioPlaying: isPlaying,
                                status: newStatus,
                            }
                        }
                    };
                });
            },
        }),
        {
            name: "digipets-storage",
            partialize: (state: PetStore) => ({
                pets: state.pets,
                activePetId: state.activePetId,
                player: state.player,
            }),
        }
    )
);
