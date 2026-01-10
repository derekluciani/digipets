import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePetStore } from "../../store/usePetStore";
import { PetType } from "../../types/game";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const NewPetScreen = () => {
    const navigate = useNavigate();
    const createPet = usePetStore((state) => state.createPet);

    const [name, setName] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        createPet(name, PetType.Fox);
        navigate("/game");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>New Pet</CardTitle>
                    <CardDescription>Choose your companion.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter pet name..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Pet Type</Label>
                            <div className="rounded-md border border-input bg-white/60 px-3 py-2 text-sm">
                                Fox (10 years)
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/")}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Start Journey
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
