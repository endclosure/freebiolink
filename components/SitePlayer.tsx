"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SitePlayer({ audioRef }: Props) {
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [volume,      setVolume]      = useState(0.15);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [showVolume,  setShowVolume]  = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay   = () => setIsPlaying(true);
    const onPause  = () => setIsPlaying(false);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded  = () => setIsPlaying(false);

    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended",          onEnded);

    return () => {
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended",          onEnded);
    };
  }, [audioRef]);

  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [audioRef]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { audio.play().catch(() => {}); }
    else              { audio.pause(); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/70 hover:text-white transition-colors"
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1.5" y="1" width="3.5" height="10" rx="1"/>
              <rect x="7"   y="1" width="3.5" height="10" rx="1"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2.5 1.5L10.5 6L2.5 10.5V1.5Z"/>
            </svg>
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="site-scrubber w-full"
            aria-label="Seek"
          />
          <div className="flex justify-between text-[0.6rem] text-white/25 tabular-nums px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowVolume((v) => !v)}
            aria-label="Volume"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white/50 hover:text-white transition-colors"
          >
            {volume === 0 ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : volume < 0.5 ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
          </button>

          {showVolume && (
            <div className="absolute bottom-full right-0 mb-2 bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 flex flex-col items-center gap-1.5 z-10 shadow-xl">
              <span className="text-[0.6rem] text-white/30 tabular-nums">{Math.round(volume * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolume}
                className="site-scrubber"
                style={{ writingMode: "vertical-lr" as const, direction: "rtl" as const, width: "4px", height: "70px", appearance: "slider-vertical" as "none" }}
                aria-label="Volume level"
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .site-scrubber {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        .site-scrubber::-webkit-slider-runnable-track {
          height: 3px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            rgba(249,168,212,0.7) 0%,
            rgba(249,168,212,0.7) calc(${progress * 100}%),
            rgba(255,255,255,0.1) calc(${progress * 100}%)
          );
        }
        .site-scrubber::-moz-range-track {
          height: 3px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.1);
        }
        .site-scrubber::-moz-range-progress {
          height: 3px;
          border-radius: 9999px;
          background: rgba(249,168,212,0.7);
        }
        .site-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          margin-top: -3.5px;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          transition: transform 0.15s;
        }
        .site-scrubber:hover::-webkit-slider-thumb {
          transform: scale(1.25);
        }
        .site-scrubber::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          border: none;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
