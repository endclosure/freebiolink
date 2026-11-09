"use client";

import { useEffect, useRef, useState } from "react";

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface ContributionData {
  total: number;
  days: ContributionDay[];
}

const LEVEL_COLORS = [
  "rgba(255,255,255,0.04)",
  "rgba(249,168,212,0.25)",
  "rgba(249,168,212,0.45)",
  "rgba(249,168,212,0.70)",
  "rgba(249,168,212,0.95)",
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const VISIBLE_DAYS = ["Mon", "Wed", "Fri"];

export default function GitHubContributions() {
  const [data, setData] = useState<ContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchContributions = async () => {
      try {
        const res = await fetch("/api/github/contributions", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as ContributionData;
        if (mounted && payload && payload.days.length > 0) {
          setData(payload);
        }
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchContributions();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data]);

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-3" />
        <div className="h-20 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { days, total } = data;

  if (days.length === 0) return null;

  const firstDate = new Date(days[0].date + "T00:00:00");
  const firstDayOfWeek = firstDate.getDay();

  const padded: (ContributionDay | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) padded.push(null);
  for (const d of days) padded.push(d);

  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const monthLabels: (string | null)[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w];
    const firstDay = week.find((d) => d !== null) as ContributionDay | undefined;
    if (firstDay) {
      const month = new Date(firstDay.date + "T00:00:00").getMonth();
      if (month !== lastMonth) {
        monthLabels.push(MONTH_LABELS[month]);
        lastMonth = month;
      } else {
        monthLabels.push(null);
      }
    } else {
      monthLabels.push(null);
    }
  }

  const CELL_SIZE = 11;
  const CELL_GAP = 2;
  const CELL_STEP = CELL_SIZE + CELL_GAP;

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#f9a8d4]/30 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 mb-3">
        <div className="flex min-w-0 items-center gap-2">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="shrink-0 text-white/40">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
          </svg>
          <span className="min-w-0 text-[0.7rem] sm:text-xs font-medium text-white/70">
            {total.toLocaleString()} contributions in the last year
          </span>
        </div>
        <a
          href="https://github.com/endclosure"
          target="_blank"
          rel="noreferrer"
          className="text-[0.65rem] text-white/30 hover:text-[#f9a8d4] transition-colors"
        >
          endclosure
        </a>
      </div>

      <div
        ref={scrollRef}
        className="gh-scroll w-full overflow-x-auto overflow-y-hidden"
      >
        <div className="flex flex-col gap-1" style={{ width: "max-content" }}>
          <div className="flex" style={{ paddingLeft: 28 }}>
            {monthLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  width: CELL_STEP,
                  fontSize: 9,
                  lineHeight: "12px",
                }}
                className="text-white/30 whitespace-nowrap"
              >
                {label || ""}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <div className="flex flex-col shrink-0" style={{ width: 24 }}>
              {DAY_LABELS.map((day, i) => (
                <div
                  key={day}
                  style={{
                    height: CELL_STEP,
                    fontSize: 9,
                    lineHeight: `${CELL_STEP}px`,
                  }}
                  className="text-white/25"
                >
                  {VISIBLE_DAYS.includes(day) ? day : ""}
                </div>
              ))}
            </div>

            <div className="flex">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: CELL_GAP }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={
                        day
                          ? `${day.date} -${day.count > 0 ? `${day.count} contribution${day.count === 1 ? "" : "s"}` : "No contributions"}`
                          : ""
                      }
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 2,
                        background: day
                          ? LEVEL_COLORS[day.level] ?? LEVEL_COLORS[0]
                          : "transparent",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[0.6rem] text-white/25 mr-1">Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: 2,
              background: color,
            }}
          />
        ))}
        <span className="text-[0.6rem] text-white/25 ml-1">More</span>
      </div>
    </div>
  );
}
