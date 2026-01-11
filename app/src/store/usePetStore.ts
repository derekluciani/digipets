import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { type PetState, type PetType, PetStatus, type GameState, PetPhase } from "../types/game";
import { GAME_CONSTANTS } from "../constants";
import { simulateOneMinute } from "../logic/simulation";
import { feed, play, sleep, clean, toggleRadio } from "../logic/actions";

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
    phase: PetPhase.Baby,

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
    eatingTime: 0,
    poopTime: 0,
    vomitTime: 0,
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
                    if (!pet) return state;

                    const newPet = feed(pet);
                    if (newPet === pet) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: newPet
                        }
                    };
                });
            },

            playPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet) return state;

                    const newPet = play(pet);
                    if (newPet === pet) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: newPet
                        }
                    };
                });
            },

            sleepPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet) return state;

                    const newPet = sleep(pet);
                    if (newPet === pet) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: newPet
                        }
                    };
                });
            },

            cleanPet: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet) return state;

                    const newPet = clean(pet);
                    if (newPet === pet) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: newPet
                        }
                    };
                });
            },

            toggleRadio: (petId: string) => {
                set((state: PetStore) => {
                    const pet = state.pets[petId];
                    if (!pet) return state;

                    const newPet = toggleRadio(pet);
                    if (newPet === pet) return state;

                    return {
                        pets: {
                            ...state.pets,
                            [petId]: newPet
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
