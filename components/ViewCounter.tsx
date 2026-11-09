"use client";

import { useEffect, useRef, useState } from "react";

export default function ViewCounter() {
  const [count, setCount] = useState<number | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/views", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === "number") setCount(data.count);
      })
      .catch(() => {});
  }, []);

  if (count === null) {
    return (
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.15em] text-white/30">Visitors</p>
        <div className="flex gap-1 mt-1.5 h-14 items-end">
          {[0, 0, 0, 0, 0].map((_, i) => (
            <div key={i} className="h-14 w-7 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const digits = count.toString().padStart(5, "0").split("");

  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-[0.15em] text-white/30">Visitors</p>
      <div className="flex gap-1 items-end mt-1.5">
        {digits.map((d, i) => (
          <img
            key={i}
            src={`/counter-girls/${d}.gif`}
            alt={d}
            className="h-14 w-auto"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
