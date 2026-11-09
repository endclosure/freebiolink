"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FiSend } from "react-icons/fi";

interface GuestBookEntry {
  id: string;
  name: string;
  message: string;
  createdAt: number;
}

const MAX_NAME = 32;
const MAX_MESSAGE = 50;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export default function GuestBook() {
  const [entries, setEntries] = useState<GuestBookEntry[]>([]);
  const [canPost, setCanPost] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/guestbook", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data.entries)) setEntries(data.entries);

        if (typeof data.canPost === "boolean") setCanPost(data.canPost);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "couldn't post right now");
        if (res.status === 429) setCanPost(false);
        return;
      }

      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
      } else if (data.entry) {
        setEntries((previous) => [data.entry, ...previous]);
      }

      setCanPost(false);
      setName("");
      setMessage("");
    } catch {
      setError("couldn't post right now");
    } finally {
      setSubmitting(false);
    }
  };

  const locked = canPost === false;
  const disabled = locked || submitting;

  return (
    <div className="grid grid-cols-1 gap-4 text-left lg:grid-cols-[0.85fr_1.15fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#f9a8d4]/25 sm:p-7"
      >
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/30">Leave a message</p>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="guestbook-name"
              className="block text-[0.65rem] uppercase tracking-[0.15em] text-white/30"
            >
              Name
            </label>
            <input
              id="guestbook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_NAME}
              required
              disabled={disabled}
              placeholder="your name"
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#f9a8d4]/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="guestbook-message"
              className="block text-[0.65rem] uppercase tracking-[0.15em] text-white/30"
            >
              Message
            </label>
            <textarea
              id="guestbook-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_MESSAGE}
              required
              disabled={disabled}
              rows={4}
              placeholder="say something nice"
              className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#f9a8d4]/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-1.5 text-right text-[0.65rem] tabular-nums text-white/25">
              {message.length}/{MAX_MESSAGE}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || !name.trim() || !message.trim()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#f9a8d4]/30 bg-[#f9a8d4]/10 px-4 py-2 text-sm font-medium text-[#f9a8d4] transition-colors hover:bg-[#f9a8d4]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "posting…" : "sign guest book"}
          <FiSend size={13} />
        </button>

        {locked && (
          <p className="mt-3 text-[0.72rem] leading-relaxed text-white/35">
            you already signed this week come back in a few days.
          </p>
        )}
        {error && <p className="mt-3 text-[0.72rem] leading-relaxed text-red-300/80">{error}</p>}
      </form>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex items-baseline justify-between">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/30">Signatures</p>
          <span className="text-[0.7rem] tabular-nums text-white/25">
            {loading ? "—" : entries.length}
          </span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.02]"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="mt-4 text-[0.8rem] text-white/35">
            no signatures yet be the first.
          </p>
        ) : (
          <ul className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#f9a8d4]/10 text-[0.7rem] font-semibold text-[#f9a8d4]">
                    {entry.name[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8rem] font-medium text-white">{entry.name}</p>
                    <p className="text-[0.65rem] text-white/25">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-[0.8rem] leading-relaxed text-white/50">
                  {entry.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
