"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  onEnter: () => void;
  onExited: () => void;
  leaving: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const WORD = "Terrified";
const LETTER_STAGGER = 0.09;
const WRITTEN_MS = 2200;

export default function Intro({ onEnter, onExited, leaving, audioRef }: Props) {
  const [fontReady, setFontReady] = useState(false);
  const [written,   setWritten]   = useState(false);
  const svgRef  = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; setFontReady(true); } };
    document.fonts?.load("700 80px 'Akira Expanded'").then(go, go);
    const t = setTimeout(go, 1400);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    if (!fontReady || !svgRef.current || !textRef.current) return;
    const b = textRef.current.getBBox();
    const pad = 12;
    svgRef.current.setAttribute(
      "viewBox",
      `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
    );
  }, [fontReady]);

  useEffect(() => {
    if (!fontReady) return;
    const t = setTimeout(() => setWritten(true), WRITTEN_MS);
    return () => clearTimeout(t);
  }, [fontReady]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onExited, 1100);
    return () => clearTimeout(t);
  }, [leaving, onExited]);

  const enter = () => {
    if (leaving) return;
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.15;
      audio.play().catch(() => {});
    }
    onEnter();
  };

  const classes = [
    "intro",
    fontReady ? "is-ready"   : "",
    written   ? "is-written" : "",
    leaving   ? "is-leaving" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <style>{`
        .intro {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
          outline: none;
          background: #0a0909;
          color: #ffffff;
          transition: opacity 0.9s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .intro.is-leaving {
          opacity: 0;
          pointer-events: none;
        }
        .intro-stage {
          transition:
            transform 0.9s cubic-bezier(0.23, 1, 0.32, 1),
            filter    0.7s cubic-bezier(0.23, 1, 0.32, 1),
            opacity   0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .intro.is-leaving .intro-stage {
          transform: scale(1.1);
          filter: blur(12px);
          opacity: 0;
        }
        .intro-word {
          width: min(520px, 88vw);
          height: auto;
          overflow: visible;
          filter: drop-shadow(0 0 14px rgba(249,168,212,0.18));
        }
        .intro-word text {
          font-family: 'Akira Expanded', sans-serif;
          font-size: 72px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 8px;
        }
        .intro-word tspan {
          fill: rgba(249,168,212,0);
          stroke: rgba(249,168,212,0.7);
          stroke-width: 0.8;
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
        }
        .intro.is-ready .intro-word tspan {
          animation:
            intro-trace 1.3s cubic-bezier(0.65, 0, 0.35, 1) both,
            intro-fill  2.0s cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        @keyframes intro-trace {
          to { stroke-dashoffset: 0; }
        }
        @keyframes intro-fill {
          0%,  60% {
            fill: rgba(249,168,212,0);
            stroke: rgba(249,168,212,0.7);
          }
          100% {
            fill: rgba(249,168,212,0.92);
            stroke: rgba(249,168,212,0);
          }
        }
        .intro-cta {
          position: absolute;
          left: 50%;
          bottom: max(44px, 7vh);
          translate: -50% 0;
          font-size: 11px;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          white-space: nowrap;
          color: rgba(255,255,255,0.3);
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.8s cubic-bezier(0.23,1,0.32,1), transform 0.8s cubic-bezier(0.23,1,0.32,1);
        }
        .intro.is-written .intro-cta {
          opacity: 1;
          transform: translateY(0);
        }
        .intro.is-leaving .intro-cta {
          opacity: 0;
          transition-duration: 0.2s;
        }
        @media (prefers-reduced-motion: reduce) {
          .intro.is-ready .intro-word tspan {
            animation: none;
            fill: rgba(249,168,212,0.92);
            stroke: none;
            stroke-dashoffset: 0;
          }
          .intro.is-leaving .intro-stage { transform: none; filter: none; }
          .intro-cta { transform: none !important; }
        }
      `}</style>

      <div
        className={classes}
        role="button"
        tabIndex={0}
        aria-label="Click to enter"
        onClick={enter}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); }
        }}
        onTransitionEnd={(e) => {
          if (leaving && e.target === e.currentTarget && e.propertyName === "opacity") onExited();
        }}
      >
        <div className="intro-stage">
          <svg
            ref={svgRef}
            className="intro-word"
            viewBox="0 0 600 110"
            aria-label={WORD}
            role="img"
          >
            <text ref={textRef} x="0" y="80">
              {Array.from(WORD).map((ch, i) => (
                <tspan
                  key={i}
                  style={{ animationDelay: `${(0.15 + i * LETTER_STAGGER).toFixed(3)}s` }}
                >
                  {ch}
                </tspan>
              ))}
            </text>
          </svg>
        </div>

        <span className="intro-cta">click anywhere to enter</span>
      </div>
    </>
  );
}
