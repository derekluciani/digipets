import { useEffect, useRef } from "react";
import { usePetStore } from "../store/usePetStore";

export const useGameLoop = () => {
    const processSimulationStep = usePetStore((state) => state.processSimulationStep);
    const activePetId = usePetStore((state) => state.activePetId);
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const animate = (time: number) => {
        if (lastTimeRef.current !== 0) {


            // Calculate elapsed game minutes
            // 0.25 Real Second = 1 Game Minute (from PRD)
            // deltaTime is in ms

            // If we want exact 1 sec = 1 minute, we accumulate time.
            // However, we should probably run based on the store's lastSimulatedAt diff
            // to handle backgrounding correctly, but for the active loop:

            // We'll rely on the store's processSimulationStep to handle the "how many minutes" logic
            // based on the store's lastSimulatedAt vs Date.now().
            // So here we just trigger it periodically or every frame.

            // Since processSimulationStep calculates based on Date.now(),
            // we can just call it.
            // But to avoid spamming calls, we can throttle or just call it every frame.
            // Calling every frame ensures smoothest updates if we interpolate, 
            // but since simulation step is integer minutes, we might want to check every second?

            // Let's call it every frame, and the store internally checks if enough time (1s) has passed.
            processSimulationStep(0); // Arg ignored if we calculate internally, or we pass delta?
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        // Start loop
        requestRef.current = requestAnimationFrame(animate);

        // Resume/Correction logic could go here or in store (visibilitychange handled by store persistence?)
        // Actually store persistence handles saving, but simulation catch-up should happen on hydration or re-focus.

        return () => cancelAnimationFrame(requestRef.current);
    }, [activePetId]); // Restart if active pet changes? Or just run globally.
};
