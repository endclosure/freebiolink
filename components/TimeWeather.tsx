"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiClock,
  FiCloud,
  FiCloudDrizzle,
  FiCloudLightning,
  FiCloudRain,
  FiCloudSnow,
  FiSun,
} from "react-icons/fi";

type Weather = {
  temperature: number;
  description: string;
  isDay: boolean;
};

const TIME_ZONE = "America/Chicago";
const WEATHER_REFRESH_MS = 10 * 60 * 1000;

function formatCentralTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function WeatherIcon({ description, isDay }: { description: string; isDay: boolean }) {
  const className = "text-[#f9a8d4]";
  if (description.includes("thunder")) return <FiCloudLightning size={15} className={className} />;
  if (description.includes("snow")) return <FiCloudSnow size={15} className={className} />;
  if (description.includes("rain")) return <FiCloudRain size={15} className={className} />;
  if (description.includes("drizzle")) return <FiCloudDrizzle size={15} className={className} />;
  if (description.includes("clear") && isDay) return <FiSun size={15} className={className} />;
  return <FiCloud size={15} className={className} />;
}

export default function TimeWeather() {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      try {
        const res = await fetch("/api/weather", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as Weather;
        if (!active) return;
        setWeather(data);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    };

    loadWeather();
    const id = setInterval(loadWeather, WEATHER_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const time = useMemo(() => (now ? formatCentralTime(now) : null), [now]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 text-left transition-colors hover:border-[#f9a8d4]/25 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#f9a8d4]/[0.07] blur-2xl"
      />

      <div className="relative flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-white/30">
        <FiClock size={13} />
        right now
        {weather && (
          <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal text-white/40">
            <WeatherIcon description={weather.description} isDay={weather.isDay} />
            {weather.isDay ? "daytime" : "nighttime"}
          </span>
        )}
      </div>

      <p className="relative mt-3 text-[1.02rem] leading-relaxed text-white/50 sm:text-[1.12rem]">
        it is{" "}
        <span className="font-semibold tabular-nums text-white">{time ?? "--:--"}</span>{" "}
        and it is{" "}
        {weather ? (
          <span className="font-semibold text-white">
            {weather.temperature}&deg;F
            <span className="font-normal text-white/50"> with {weather.description}</span>
          </span>
        ) : failed ? (
          <span className="text-white/35">looking a little unclear right now</span>
        ) : (
          <span className="inline-flex h-[1.05em] w-16 translate-y-[0.15em] animate-pulse rounded bg-white/10 align-middle" />
        )}
      </p>
    </div>
  );
}
