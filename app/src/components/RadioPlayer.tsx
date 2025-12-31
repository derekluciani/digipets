import { useEffect, useRef } from "react";
import { usePetStore } from "../store/usePetStore";

// Import audio. Using a direct URL or importing from assets if moved there.
// Plan: Move _context/radio_song_loop.mp3 to public/radio_song_loop.mp3 or import.
// Using public folder is easier for dynamic loading.
const RADIO_URL = "/radio_song_loop.mp3";

export const RadioPlayer = () => {
    const activePetId = usePetStore((state) => state.activePetId);
    const pets = usePetStore((state) => state.pets);
    const pet = activePetId ? pets[activePetId] : null;
    const audioRef = useRef<HTMLAudioElement>(null);

    const isPlaying = pet?.isRadioPlaying && !pet?.isDead && pet?.status !== "Sleeping"; // Don't play if sleeping? PRD says "Radio -> Dancing... Only if Idle". Logic in toggleRadio handles status transition.
    // But if status changes to Sleeping manually, we should probably stop music? 
    // PRD: "Audio playback will loop continuously unless toggled to stop".
    // However, if sleeping, maybe we should pause? Or just let it play? 
    // Let's stick to "isPlaying" flag. If user toggles it off, it stops. 
    // "User Actions are active during this status".

    useEffect(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
        } else {
            audioRef.current.pause();
            audioRef.current.currentTime = 0; // Reset? or Resume? Toggled to stop -> Reset usually.
        }
    }, [isPlaying]);

    return <audio ref={audioRef} src={RADIO_URL} loop className="hidden" />;
};
