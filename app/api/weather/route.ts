import { NextResponse } from "next/server";

const LATITUDE = Number(process.env.WEATHER_LAT ?? "34.7304");
const LONGITUDE = Number(process.env.WEATHER_LON ?? "-86.5861");
const TIME_ZONE = process.env.WEATHER_TIMEZONE ?? "America/Chicago";

const weatherDescriptions: Record<number, string> = {
  0: "clear skies",
  1: "mainly clear skies",
  2: "partly cloudy skies",
  3: "overcast skies",
  45: "fog",
  48: "freezing fog",
  51: "light drizzle",
  53: "drizzle",
  55: "dense drizzle",
  56: "freezing drizzle",
  57: "heavy freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "heavy freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light rain showers",
  81: "rain showers",
  82: "violent rain showers",
  85: "light snow showers",
  86: "heavy snow showers",
  95: "a thunderstorm",
  96: "a thunderstorm with hail",
  99: "a heavy thunderstorm with hail",
};

function describe(code: number) {
  return weatherDescriptions[code] ?? "unclear skies";
}

export async function GET() {
  try {
    const params = new URLSearchParams({
      latitude: String(LATITUDE),
      longitude: String(LONGITUDE),
      current: "temperature_2m,weather_code,is_day",
      temperature_unit: "fahrenheit",
      timezone: TIME_ZONE,
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`weather upstream responded ${res.status}`);

    const payload = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
    };
    const current = payload.current;
    if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") {
      throw new Error("unexpected weather payload");
    }

    return NextResponse.json(
      {
        temperature: Math.floor(current.temperature_2m),
        description: describe(current.weather_code),
        isDay: current.is_day === 1,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return NextResponse.json({ error: "weather_unavailable" }, { status: 503 });
  }
}
