import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { usePetStore } from "../../store/usePetStore";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { type PetState, PetPhase } from "../../types/game";

export const StartScreen = () => {
    const navigate = useNavigate();
    const pets = usePetStore((state) => state.pets);
    const setActivePet = usePetStore((state) => state.setActivePet);
    const deletePet = usePetStore((state) => state.deletePet);
    const petList = (Object.values(pets) as PetState[]).sort((a, b) => b.birthday - a.birthday);

    const handleSelectPet = (id: string) => {
        setActivePet(id);
        navigate("/game");
    };

    const handleDeletePet = (e: React.MouseEvent, petId: string, petName: string) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to release ${petName}? This cannot be undone.`)) {
            deletePet(petId);
        }
    };

    const handleCreateNew = () => {
        navigate("/new");
    };

    const phaseEmojis: Record<PetPhase, string> = {
        [PetPhase.Baby]: "🍼",
        [PetPhase.Toddler]: "🧸",
        [PetPhase.Teen]: "🧢",
        [PetPhase.Adult]: "🦊", // Default for now
        [PetPhase.Special]: "🦄",
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 p-4 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Digipets</h1>
                <p className="text-muted-foreground">Your digital companion awaits.</p>
            </div>

            <div className="w-full max-w-md space-y-4">
                <div className="grid gap-4">
                    {petList.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                            No pets found. Start a new journey!
                        </div>
                    ) : (
                        petList.map((pet) => (
                            <Card key={pet.id} className="cursor-pointer hover:bg-neutral-50 transition-colors" onClick={() => handleSelectPet(pet.id)}>
                                <CardHeader className="p-4">
                                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                                        <span className="text-2xl" aria-label={pet.phase} role="img">{phaseEmojis[pet.phase]}</span>

                                        <div className="min-w-0">
                                            <CardTitle className="text-lg truncate flex items-center gap-2">
                                                {pet.name}
                                                {!pet.isDead && (
                                                    <span className="h-2.5 w-2.5 rounded-full bg-lime-500 shrink-0" aria-label="Active" />
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                Age: {Math.floor(pet.age)} | Status: {pet.status}{pet.isDead ? " (Deceased)" : ""}
                                            </CardDescription>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                            onClick={(e) => handleDeletePet(e, pet.id, pet.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))
                    )}
                </div>

                <Button className="w-full" size="lg" onClick={handleCreateNew}>
                    Create New Pet
                </Button>
            </div>
        </div>
    );
};
