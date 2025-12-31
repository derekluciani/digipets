import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePetStore } from "../../store/usePetStore";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
// import { PetState } from "../../types/game";

export const DeathScreen = () => {
    const navigate = useNavigate();
    const summaryRef = useRef<HTMLDivElement>(null);

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

    const handleExport = async () => {
        if (!summaryRef.current) return;
        const canvas = await html2canvas(summaryRef.current);
        const link = document.createElement("a");
        link.download = `digipet-${pet.name}-summary.jpg`;
        link.href = canvas.toDataURL("image/jpeg");
        link.click();
    };

    const scoreGrade = (score: number) => {
        if (score >= 95) return "S+";
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 70) return "C";
        if (score >= 60) return "D";
        return "F";
    };

    const finalGrade = scoreGrade(pet.caretakerScore || 0);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 text-white">
            <h1 className="text-4xl font-bold mb-8 text-red-500">GAME OVER</h1>

            <Card ref={summaryRef} className="w-full max-w-sm shadow-2xl">
                <CardHeader className="text-center">
                    <div className="text-6xl mb-4">🪦</div>
                    <CardTitle className="text-2xl font-bold">{pet.name}</CardTitle>
                    <CardDescription>{pet.petType}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                        <span>Lifespan:</span>
                        <span className="font-bold">{pet.age} Years</span>
                    </div>
                    <div className="flex justify-between text-yellow-600">
                        <span>Caretaker Score:</span>
                        <span className="font-bold">{pet.caretakerScore}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                        <span>Rank:</span>
                        <span>{finalGrade}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-4 mt-8 w-full max-w-sm">
                <Button className="flex-1" variant="secondary" onClick={() => navigate("/")}>
                    Main Menu
                </Button>
                <Button className="flex-1" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
            </div>
        </div>
    );
};
