"use client";

import { useRef, useState, useCallback } from "react";
import ShaderBackground from "@/components/background/ShaderBackground";
import LanyardStatus from "@/components/LanyardStatus";
import MusicPlayer from "@/components/MusicPlayer";
import SitePlayer from "@/components/SitePlayer";
import Intro from "@/components/Intro";
import type { StoredSpotify } from "@/app/lib/presence/types";

const STORAGE_KEY = "spotify_last";

function loadSaved(): { spotify: StoredSpotify; timestamps: { start: number; end: number } } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function HomePage() {
  const saved = typeof window !== "undefined" ? loadSaved() : null;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [leaving,    setLeaving]    = useState(false);
  const [exited,     setExited]     = useState(false);
  const [spotify,    setSpotify]    = useState<StoredSpotify | null>(saved?.spotify ?? null);
  const [isLive,     setIsLive]     = useState(false);
  const [timestamps, setTimestamps] = useState<{ start: number; end: number } | null>(saved?.timestamps ?? null);

  const handleSpotifyChange = useCallback(
    (s: StoredSpotify | null, live: boolean, ts: { start: number; end: number } | null) => {
      setSpotify(s);
      setIsLive(live);
      setTimestamps(ts);
      if (s && ts) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ spotify: s, timestamps: ts })); } catch {}
      }
    },
    []
  );

  return (
    <>
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />

      <ShaderBackground color={[1.0, 0.52, 0.78]} />

      <main
        className={`relative min-h-screen flex flex-col items-center justify-center px-4 pb-16 sm:px-6 transition-opacity duration-700 ${
          exited ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex w-full flex-col items-center gap-3 max-w-sm mx-auto">
          <LanyardStatus onSpotifyChange={handleSpotifyChange} />
          <SitePlayer audioRef={audioRef} />
          <MusicPlayer spotify={spotify} isLive={isLive} timestamps={timestamps} />
        </div>
      </main>

      {!exited && (
        <Intro
          leaving={leaving}
          audioRef={audioRef}
          onEnter={() => setLeaving(true)}
          onExited={() => setExited(true)}
        />
      )}
    </>
  );
}
