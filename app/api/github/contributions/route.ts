import { NextResponse } from "next/server";

export const revalidate = 3600;

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface ContributionData {
  total: number;
  days: ContributionDay[];
}

export async function GET() {
  const username = "endclosure";

  try {
    const res = await fetch(
      `https://github.com/users/${username}/contributions`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub returned ${res.status}` },
        { status: res.status }
      );
    }

    const html = await res.text();

    const days: ContributionDay[] = [];

    const tdRegex = /<td[^>]*data-date="([^"]+)"[^>]*data-level="(\d+)"[^>]*>/g;
    let match: RegExpExecArray | null;

    while ((match = tdRegex.exec(html)) !== null) {
      const date = match[1];
      const level = parseInt(match[2], 10);
      days.push({ date, count: 0, level });
    }

    if (days.length === 0) {
      return NextResponse.json(
        { error: "Could not parse contribution data" },
        { status: 502 }
      );
    }

    days.sort((a, b) => a.date.localeCompare(b.date));

    let total = 0;
    const totalMatch = html.match(
      /<h2[^>]*id="js-contribution-activity-description"[^>]*>\s*(\d+)\s+contributions/i
    );
    if (totalMatch) {
      total = parseInt(totalMatch[1], 10);
    }

    const body: ContributionData = { total, days };
    return NextResponse.json(body);
  } catch (e) {
    console.error("Error fetching GitHub contributions:", e);
    return NextResponse.json(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
}
