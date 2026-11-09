"use client";

import { useEffect, useState } from "react";
import type { StoredSpotify } from "@/app/lib/presence/types";

type LyricLine = { time: number; text: string };

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const line of lrc.split("\n")) {
    const match = line.match(/^\[(\d+):(\d+)\.(\d+)\]\s*(.*)/);
    if (!match) continue;
    const time = parseInt(match[1], 10) * 60000 + parseInt(match[2], 10) * 1000 + parseInt(match[3].padEnd(3, "0").slice(0, 3), 10);
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

interface Props {
  spotify: StoredSpotify | null;
  isLive: boolean;
  timestamps: { start: number; end: number } | null;
}

export default function CurrentLyric({ spotify, isLive, timestamps }: Props) {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [currentLyric, setCurrentLyric] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLines([]);
    setCurrentLyric(null);
    if (!spotify) return;

    (async () => {
      try {
        const params = new URLSearchParams({ track: spotify.song, artist: spotify.artist });
        if (spotify.track_id) params.set("trackId", spotify.track_id);
        const res = await fetch(`/api/lyrics?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.syncedLyrics) setLines(parseLrc(data.syncedLyrics));
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [spotify?.track_id, spotify?.song, spotify?.artist]);

  useEffect(() => {
    if (!isLive || !timestamps || lines.length === 0) { setCurrentLyric(null); return; }

    const sync = () => {
      const elapsed = Date.now() - timestamps.start;
      if (elapsed < 0 || Date.now() >= timestamps.end) { setCurrentLyric(null); return; }
      let lo = 0, hi = lines.length - 1, idx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= elapsed) { idx = mid; lo = mid + 1; } else hi = mid - 1;
      }
      setCurrentLyric(idx >= 0 ? lines[idx].text : null);
    };

    sync();
    const id = setInterval(sync, 250);
    return () => clearInterval(id);
  }, [lines, isLive, timestamps]);

  if (!currentLyric) return null;

  return (
    <div className="w-full text-center" aria-live="polite">
      <p className="text-sm font-semibold text-[#f9a8d4] drop-shadow-[0_0_12px_rgba(249,168,212,0.4)]">
        {currentLyric}
      </p>
    </div>
  );
}
