import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePetStore } from "../../store/usePetStore";
import { useGameLoop } from "../../hooks/useGameLoop";
import { GAME_CONSTANTS } from "../../constants";
import { PetStatus } from "../../types/game";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card, CardContent } from "../ui/card";
// import { Radio } from "lucide-react";

import { RadioPlayer } from "../RadioPlayer";

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

    // Start Simulation Loop
    useGameLoop();

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
    const isNight = pet.minuteOfDay >= GAME_CONSTANTS.DAY_PHASE_LIMIT;

    return (
        <div className={`flex flex-col items-center min-h-screen p-4 transition-colors duration-1000 ${isNight ? 'bg-slate-900 text-white' : 'bg-sky-100 text-slate-900'}`}>
            <RadioPlayer />

            {/* Header */}
            <div className="w-full max-w-md flex justify-between items-center mb-8">
                <Button variant="ghost" onClick={() => navigate("/")} className={isNight ? "text-white hover:bg-slate-800" : ""}>
                    ← Menu
                </Button>
                <div className="text-xl font-bold">{pet.name}</div>
                <div className="text-sm">Day {Number(pet.age).toFixed(0)}</div>
            </div>

            {/* Main Visual */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md space-y-8">

                <div className="relative text-[120px] leading-none animate-bounce-slow filter drop-shadow-xl select-none">
                    {getEmoji()}
                    {pet.isDirty && <span className="absolute bottom-0 right-0 text-4xl">💩</span>}
                    {pet.isRadioPlaying && <span className="absolute top-0 right-0 text-4xl animate-pulse">🎵</span>}
                </div>

                <div className="text-center font-medium opacity-80">
                    {pet.status}
                </div>

                {/* Vitals */}
                <Card className={`w-full ${isNight ? "bg-slate-800 border-slate-700 text-white" : "bg-white/80 backdrop-blur"}`}>
                    <CardContent className="grid gap-4 py-6">
                        <VitalRow label="Hunger" value={pet.hunger} max={100} color="bg-orange-500" inverted />
                        <VitalRow label="Energy" value={pet.energy} max={100} color="bg-yellow-500" />
                        <VitalRow label="Mood" value={pet.mood} max={100} color="bg-pink-500" />
                        <VitalRow label="Health" value={pet.healthPoints} max={100} color="bg-red-600" />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3 w-full">
                    <ActionButton label="Feed" onClick={() => feedPet(pet.id)} disabled={pet.status === PetStatus.Sleeping} emoji="🍎" />
                    <ActionButton label="Play" onClick={() => playPet(pet.id)} disabled={pet.status === PetStatus.Sleeping || pet.energy < 10} emoji="🎾" />
                    <ActionButton label={pet.status === PetStatus.Sleeping ? "Wake" : "Sleep"} onClick={() => sleepPet(pet.id)} emoji="💤" />
                    <ActionButton label="Clean" onClick={() => cleanPet(pet.id)} disabled={!pet.isDirty} emoji="✨" />
                    <ActionButton
                        label={pet.isRadioPlaying ? "Radio Off" : "Radio On"}
                        onClick={() => toggleRadio(pet.id)}
                        disabled={pet.status === PetStatus.Sleeping}
                        emoji="📻"
                        active={pet.isRadioPlaying}
                    />
                </div>

            </div>
        </div>
    );
};

const VitalRow = ({ label, value, max, color }: { label: string, value: number, max: number, color: string, inverted?: boolean }) => (
    <div className="grid grid-cols-4 items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Progress value={(value / max) * 100} className="col-span-3 h-2" indicatorClassName={color} />
    </div>
);

const ActionButton = ({ label, onClick, disabled, emoji, active }: { label: string, onClick: () => void, disabled?: boolean, emoji: string, active?: boolean }) => (
    <Button
        variant={active ? "default" : "secondary"}
        className={`h-20 flex flex-col gap-1 items-center justify-center ${active ? 'border-2 border-primary' : ''}`}
        onClick={onClick}
        disabled={disabled}
    >
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs">{label}</span>
    </Button>
);
