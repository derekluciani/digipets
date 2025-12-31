import { useNavigate } from "react-router-dom";
import { usePetStore } from "../../store/usePetStore";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { type PetState } from "../../types/game";

export const StartScreen = () => {
    const navigate = useNavigate();
    const pets = usePetStore((state) => state.pets);
    const setActivePet = usePetStore((state) => state.setActivePet);
    const petList = Object.values(pets) as PetState[];

    const handleSelectPet = (id: string) => {
        setActivePet(id);
        navigate("/game");
    };

    const handleCreateNew = () => {
        navigate("/new");
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
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{pet.name}</CardTitle>
                                        <span className="text-sm font-medium text-muted-foreground">{pet.petType}</span>
                                    </div>
                                    <CardDescription>
                                        Age: {pet.age} | Status: {pet.status}{pet.isDead ? " (Deceased)" : ""}
                                    </CardDescription>
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
