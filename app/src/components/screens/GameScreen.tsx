import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePetStore } from "../../store/usePetStore";
import { useGameLoop } from "../../hooks/useGameLoop";
import { GAME_CONSTANTS, isNightMinuteOfDay } from "../../constants";
import { PetStatus, PetPhase } from "../../types/game";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
// import { Radio } from "lucide-react";

import { RadioPlayer } from "../RadioPlayer";
import positiveSfxWavUrl from "../../assets/positive.wav";
import negativeSfxWavUrl from "../../assets/negative.wav";

export const GameScreen = () => {
    const navigate = useNavigate();
    const activePetId = usePetStore((state) => state.activePetId);
    const pets = usePetStore((state) => state.pets);

    // Actions
    const feedPet = usePetStore((state) => state.feedPet);
    const playPet = usePetStore((state) => state.playPet);
    const sleepPet = usePetStore((state) => state.sleepPet);
    const cleanPet = usePetStore((state) => state.cleanPet);
    const toggleRadio = usePetStore((state) => state.toggleRadio);

    const pet = activePetId ? pets[activePetId] : null;

    const increaseAudioRef = useRef<HTMLAudioElement>(null);
    const decreaseAudioRef = useRef<HTMLAudioElement>(null);
    const audioUnlockedRef = useRef(false);

    const sfxUrls = {
        increase: positiveSfxWavUrl,
        decrease: negativeSfxWavUrl,
    };

    const prevVitalsRef = useRef<{
        hunger: number;
        mood: number;
        energy: number;
        weight: number;
        healthPoints: number;
    } | null>(null);

    // Start Simulation Loop
    useGameLoop();


    useEffect(() => {
        const unlockAudio = () => {
            if (audioUnlockedRef.current) return;
            audioUnlockedRef.current = true;

            const toUnlock = [increaseAudioRef.current, decreaseAudioRef.current].filter(
                (el): el is HTMLAudioElement => Boolean(el)
            );

            for (const el of toUnlock) {
                const previousMuted = el.muted;
                el.muted = true;
                el.play()
                    .then(() => {
                        el.pause();
                        el.currentTime = 0;
                        el.muted = previousMuted;
                    })
                    .catch(() => {
                        el.muted = previousMuted;
                    });
            }
        };

        window.addEventListener("pointerdown", unlockAudio, { once: true });
        window.addEventListener("keydown", unlockAudio, { once: true });

        return () => {
            window.removeEventListener("pointerdown", unlockAudio);
            window.removeEventListener("keydown", unlockAudio);
        };
    }, []);

    useEffect(() => {
        prevVitalsRef.current = null;
    }, [activePetId]);

    useEffect(() => {
        if (!pet) return;

        const current = {
            hunger: pet.hunger,
            mood: pet.mood,
            energy: pet.energy,
            weight: pet.weight,
            healthPoints: pet.healthPoints,
        };

        const previous = prevVitalsRef.current;
        prevVitalsRef.current = current;

        if (!previous) return;

        const keys = Object.keys(current) as Array<keyof typeof current>;
        let hasPositiveChange = false;
        let hasNegativeChange = false;

        for (const key of keys) {
            const delta = current[key] - previous[key];
            if (delta === 0) continue;

            const isPositiveChange = key === "hunger" ? delta < 0 : delta > 0;

            if (isPositiveChange) hasPositiveChange = true;
            else hasNegativeChange = true;
        }

        const playSfx = (audioEl: HTMLAudioElement | null) => {
            if (!audioEl) return;
            audioEl.pause();
            audioEl.currentTime = 0;
            audioEl.play().catch((e) => {
                console.warn(
                    "SFX playback failed (often autoplay policy or unsupported codec):",
                    e
                );
            });
        };

        if (hasPositiveChange) playSfx(increaseAudioRef.current);

        let timeoutId: number | undefined;
        if (hasNegativeChange) {
            timeoutId = window.setTimeout(
                () => playSfx(decreaseAudioRef.current),
                hasPositiveChange ? 120 : 0
            );
        }

        return () => {
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };
    }, [pet]);


    useEffect(() => {
        if (!pet) {
            navigate("/");
            return;
        }
        if (pet.isDead) {
            navigate("/death");
        }
    }, [pet, navigate]);

    if (!pet) return null;

    // Emojis based on Status
    const getEmoji = () => {
        if (pet.isDead) return "💀";
        switch (pet.status) {
            case PetStatus.Eating: return "🍖";
            case PetStatus.Pooping: return "💩";
            case PetStatus.Playing: return "🎾";
            case PetStatus.Sleeping: return "💤";
            case PetStatus.Vomiting: return "🤮";
            case PetStatus.Dancing: return "💃";
            default:
                // Idle variatons?
                if (pet.isSick) return "🤢";
                if (pet.mood < 30) return "😢";
                if (pet.mood > 70) return "😃";
                return "😐";
        }
    };

    // Day/Night indicator
    const isNight = isNightMinuteOfDay(pet.minuteOfDay);

    const phaseEmojis: Record<PetPhase, string> = {
        [PetPhase.Baby]: "🍼",
        [PetPhase.Toddler]: "🧸",
        [PetPhase.Teen]: "🧢",
        [PetPhase.Adult]: "🦊",
        [PetPhase.Special]: "🦄",
    };

    return (
        <div className={`flex flex-col items-center min-h-screen p-4 transition-colors duration-1000 ${isNight ? 'bg-slate-900 text-white' : 'bg-sky-100 text-slate-900'}`}>
            <RadioPlayer />
            <audio ref={increaseAudioRef} src={sfxUrls.increase} preload="auto" className="hidden" />
            <audio ref={decreaseAudioRef} src={sfxUrls.decrease} preload="auto" className="hidden" />

            {/* Header */}
            <div className="w-full max-w-md flex flex-col gap-4 mb-8">
                <div className="flex justify-start">
                    <Button variant="ghost" onClick={() => navigate("/")} className={`pl-0 hover:bg-transparent ${isNight ? "text-white hover:text-slate-300" : "text-slate-600 hover:text-slate-900"}`}>
                        ← Menu
                    </Button>
                </div>

                <div className="flex justify-between items-center">
                    <div className="text-4xl font-black tracking-tight drop-shadow-sm">{pet.name}</div>

                    <div className={`flex items-center gap-3 px-5 py-3 rounded-md shadow-sm border-2 backdrop-blur-sm transition-all ${isNight ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/50 border-slate-200 text-slate-900"}`}>
                        <span className="text-3xl filter drop-shadow-sm">{isNight ? '🌙' : '☀️'}</span>
                        <div className="flex flex-col items-end leading-none">
                            <span className="font-mono text-3xl font-black tracking-tight tabular-nums">
                                {Math.floor((pet.minuteOfDay % 1440) / 60) % 12 || 12}:
                                {Math.floor(pet.minuteOfDay % 60).toString().padStart(2, "0")}
                            </span>
                            <span className="text-xs font-bold uppercase opacity-60 tracking-widest mt-0.5">
                                {Math.floor((pet.minuteOfDay % 1440) / 60) >= 12 ? 'PM' : 'AM'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Visual */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md space-y-8">

                <div className="flex items-center justify-center gap-8 text-[120px] leading-none animate-bounce-slow filter drop-shadow-xl select-none">
                    <span aria-label="Fox" role="img">🦊</span>
                    <span className="relative" aria-label="Pet status" role="img">
                        {getEmoji()}
                        {pet.isDirty && <span className="absolute bottom-0 right-0 text-4xl">💩</span>}
                        {pet.isRadioPlaying && <span className="absolute top-0 right-0 text-4xl animate-pulse">🎵</span>}
                    </span>
                </div>

                <div className="text-center font-medium opacity-80">
                    {pet.status}
                </div>

                {/* Vitals */}
                <Card className={`w-full ${isNight ? "bg-slate-800 border-slate-700 text-white" : "bg-white/80 backdrop-blur"}`}>
                    <CardContent className="grid gap-4 py-6">
                        <VitalRow label="Age" value={pet.age} suffix="Years" icon={phaseEmojis[pet.phase]} />
                        <VitalRow label="Hunger" value={pet.hunger} max={100} isCritical={pet.hunger >= GAME_CONSTANTS.HUNGER_STARVING} />
                        <VitalRow label="Energy" value={pet.energy} max={100} isCritical={pet.energy <= GAME_CONSTANTS.MOOD_LOW} />
                        <VitalRow label="Mood" value={pet.mood} max={100} isCritical={pet.mood <= GAME_CONSTANTS.MOOD_LOW} />
                        <VitalRow label="Health" value={pet.healthPoints} max={100} isCritical={pet.healthPoints <= 20} />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3 w-full">
                    <ActionButton label="Feed" onClick={() => feedPet(pet.id)} disabled={pet.status === PetStatus.Sleeping} emoji="🍎" isNight={isNight} />
                    <ActionButton
                        label={pet.status === PetStatus.Playing ? "Stop" : "Play"}
                        onClick={() => playPet(pet.id)}
                        disabled={pet.status === PetStatus.Sleeping || (pet.status !== PetStatus.Playing && pet.energy <= 33)}
                        emoji="🎾"
                        active={pet.status === PetStatus.Playing}
                        isNight={isNight}
                    />
                    <ActionButton label={pet.status === PetStatus.Sleeping ? "Wake" : "Sleep"} onClick={() => sleepPet(pet.id)} emoji="💤" isNight={isNight} />
                    <ActionButton label="Clean" onClick={() => cleanPet(pet.id)} disabled={!pet.isDirty} emoji="✨" isNight={isNight} />
                    <ActionButton
                        label={pet.isRadioPlaying ? "Radio Off" : "Radio On"}
                        onClick={() => toggleRadio(pet.id)}
                        disabled={pet.status === PetStatus.Sleeping}
                        emoji="📻"
                        active={pet.isRadioPlaying}
                        isNight={isNight}
                    />
                </div>

            </div>
        </div>
    );
};

const VitalRow = ({ label, value, max, isCritical, suffix, icon }: { label: string, value: number, max?: number, isCritical?: boolean, suffix?: string, icon?: string }) => (
    <div className="flex justify-between items-center border-b border-black/5 last:border-0 pb-2 last:pb-0">
        <span className="text-sm font-medium">{label}</span>
        <span className={`font-mono text-xl font-bold ${isCritical ? 'text-red-500' : ''}`}>
            {icon && <span className="mr-2 text-xl inline-block align-middle">{icon}</span>}
            <span className="align-middle">{Math.round(value)}</span>
            {suffix && <span className="text-sm font-normal opacity-50 ml-1 align-middle">{suffix}</span>}
            {max !== undefined && <span className={`text-sm font-normal opacity-50 ${isCritical ? 'text-red-500' : ''} align-middle`}>/{max}</span>}
        </span>
    </div>
);

const ActionButton = ({ label, onClick, disabled, emoji, active, isNight }: { label: string, onClick: () => void, disabled?: boolean, emoji: string, active?: boolean, isNight?: boolean }) => (
    <Button
        variant={active ? "default" : "outline"}
        className={`h-24 flex flex-col gap-2 items-center justify-center transition-all active:scale-95 rounded-2xl backdrop-blur-md border-2 ${!disabled ? 'shadow-lg' : 'shadow-none'
            } ${active
                ? 'ring-2 ring-primary ring-offset-2 border-transparent'
                : isNight
                    ? 'bg-slate-800/80 border-slate-600 text-blue-100 hover:bg-slate-700'
                    : 'bg-white/60 border-white text-slate-800 hover:bg-white/80'
            } ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}
        onClick={onClick}
        disabled={disabled}
    >
        <span className="text-3xl filter drop-shadow-sm">{emoji}</span>
        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</span>
    </Button>
);
