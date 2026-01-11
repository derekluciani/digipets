import { useNavigate } from "react-router-dom";
import { usePetStore } from "../../store/usePetStore";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { PetPhase } from "../../types/game";

export const DeathScreen = () => {
    const navigate = useNavigate();

    const activePetId = usePetStore((state) => state.activePetId);
    const pets = usePetStore((state) => state.pets);
    const pet = activePetId ? pets[activePetId] : null;

    if (!pet || !pet.isDead) { // If refreshed and not dead, or no pet
        // If dead but refreshed, we stay.
        if (pet && !pet.isDead) {
            navigate("/");
            return null;
        }
        if (!pet) {
            navigate("/");
            return null;
        }
    }

    const scoreGrade = (score: number) => {
        if (score >= 95) return "S+";
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 70) return "C";
        if (score >= 60) return "D";
        return "F";
    };

    const finalGrade = scoreGrade(pet.caretakerScore || 0);

    const formatCause = (cause?: string) => {
        if (!cause) return "Unknown";
        if (cause === "OldAge") return "Old Age";
        return cause;
    };

    const phaseEmojis: Record<PetPhase, string> = {
        [PetPhase.Baby]: "🍼",
        [PetPhase.Toddler]: "🧸",
        [PetPhase.Teen]: "🧢",
        [PetPhase.Adult]: "🦊",
        [PetPhase.Special]: "🦄",
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 text-white">
            <h1 className="text-4xl font-bold mb-8 text-red-500">GAME OVER</h1>

            <Card className="w-full max-w-sm shadow-2xl">
                <CardHeader className="text-center">
                    <div className="text-6xl mb-4">🪦</div>
                    <CardTitle className="text-2xl font-bold">{pet.name}</CardTitle>
                    <CardDescription>{pet.petType}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                        <span>Lifespan:</span>
                        <span className="font-bold">
                            <span className="mr-2">{phaseEmojis[pet.phase]}</span>
                            {pet.age} Years
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cause:</span>
                        <span className="font-bold text-red-600">{formatCause(pet.causeOfDeath)}</span>
                    </div>
                    <div className="flex justify-between text-yellow-600">
                        <span>Caretaker Score:</span>
                        <span className="font-bold">{pet.caretakerScore}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                        <span>Rank:</span>
                        <span>{finalGrade}</span>
                    </div>

                    <div className="border-t pt-3 mt-3">
                        <div className="text-sm font-semibold mb-2 text-muted-foreground">Final Vitals</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span>Hunger</span>
                                <span className="font-mono font-semibold">{Math.round(pet.hunger)}/100</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Energy</span>
                                <span className="font-mono font-semibold">{Math.round(pet.energy)}/100</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mood</span>
                                <span className="font-mono font-semibold">{Math.round(pet.mood)}/100</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Health</span>
                                <span className="font-mono font-semibold">{Math.round(pet.healthPoints)}/100</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Weight</span>
                                <span className="font-mono font-semibold">{Math.round(pet.weight)}/100</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-4 mt-8 w-full max-w-sm">
                <Button className="flex-1" variant="secondary" onClick={() => navigate("/")}>
                    Main Menu
                </Button>
            </div>
        </div>
    );
};
