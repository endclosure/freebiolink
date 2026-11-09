"use client";

import { useEffect, useRef, useState } from "react";
import type { StoredSpotify } from "@/app/lib/presence/types";

interface Props {
  spotify: StoredSpotify | null;
  isLive: boolean;
  timestamps: { start: number; end: number } | null;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function EqBars() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-[#f9a8d4]"
          style={{
            height: "100%",
            animation: `eq-bar ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.12}s`,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </span>
  );
}

export default function MusicPlayer({ spotify, isLive, timestamps }: Props) {
  const [progress, setProgress] = useState(0);
  const [elapsed,  setElapsed]  = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLive || !timestamps) {
      setProgress(0);
      setElapsed(0);
      setDuration(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const total = (timestamps.end - timestamps.start) / 1000;
    setDuration(total);

    const tick = () => {
      const now = Date.now();
      const el = Math.max(0, Math.min((now - timestamps.start) / 1000, total));
      setElapsed(el);
      setProgress(total > 0 ? el / total : 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isLive, timestamps]);

  if (!spotify || !isLive) return null;

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-3.5">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={spotify.album_art_url}
            alt={spotify.song}
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10"
          />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#1DB954] ring-2 ring-[#0a0909]">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-black" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[0.82rem] font-semibold text-white truncate leading-tight">
              {spotify.song}
            </p>
            <EqBars />
          </div>
          <p className="text-[0.7rem] text-white/40 truncate mt-0.5">{spotify.artist}</p>
        </div>

        {duration > 0 && (
          <span className="text-[0.65rem] text-white/30 tabular-nums shrink-0">
            {formatTime(elapsed)} / {formatTime(duration)}
          </span>
        )}
      </div>

      {duration > 0 && (
        <div className="mt-3 h-[3px] w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#f9a8d4] transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.2); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
