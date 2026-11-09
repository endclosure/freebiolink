"use client";

import { useEffect, useState } from "react";
import type { StoredSpotify } from "@/app/lib/presence/types";

function TrackCard({ track }: { track: StoredSpotify }) {
  const spotifyUrl = `https://open.spotify.com/track/${track.track_id}`;
  return (
    <a
      href={spotifyUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] hover:border-[#f9a8d4]/40 transition-colors"
    >
      <div className="aspect-square w-full overflow-hidden">
        <img
          src={track.album_art_url}
          alt={track.song}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
        <strong className="text-white text-sm font-semibold leading-tight line-clamp-1">{track.song}</strong>
        <span className="text-white/60 text-xs mt-0.5 line-clamp-1">{track.artist}</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-200 flex flex-col justify-end p-3">
        <strong className="text-white text-sm font-semibold leading-tight line-clamp-1">{track.song}</strong>
        <span className="text-white/50 text-xs mt-0.5 line-clamp-1">{track.artist}</span>
      </div>
    </a>
  );
}

export default function RecentTracks() {
  const [tracks, setTracks] = useState<StoredSpotify[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch("/api/music")
        .then((r) => r.json())
        .then((data) => { setTracks(data); setLoading(false); })
        .catch(() => setLoading(false));

    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tracks.length) {
    return <p className="text-white/30 text-sm">no tracks yet, play something on Spotify</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {tracks.map((t, i) => (
        <TrackCard key={`${t.track_id}-${i}`} track={t} />
      ))}
    </div>
  );
}
