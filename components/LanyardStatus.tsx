"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSmartphone, FiMonitor, FiGlobe } from "react-icons/fi";
import { SiGithub, SiDiscord } from "react-icons/si";
import type { LanyardData, Activity, StoredSpotify, PresenceResponse } from "@/app/lib/presence/types";
import { CLIENT_POLL_INTERVAL, statusDotMap } from "@/app/lib/presence/constants";
import { getDiscordAvatarUrl, findGameActivity } from "@/app/lib/presence/utils";

const USER_ID = "1567824321836089354";

const socials = [
  { label: "GitHub",  href: "https://github.com/endclosure",                icon: SiGithub  },
  { label: "Discord", href: "https://discord.com/users/1567824321836089354", icon: SiDiscord },
];

function resolveAsset(applicationId: string | undefined, asset: string | undefined): string | null {
  if (!asset) return null;
  if (asset.startsWith("mp:external/")) {
    const path = asset.replace("mp:external/", "");
    return `https://media.discordapp.net/external/${path}`;
  }
  if (asset.startsWith("https://")) return asset;
  if (applicationId) {
    return `https://cdn.discordapp.com/app-assets/${applicationId}/${asset}.png?size=160`;
  }
  return null;
}

function getActivityIcon(act: Activity): string | null {
  return resolveAsset(act.application_id, act.assets?.large_image ?? act.assets?.small_image);
}

function getCustomStatus(activities: Activity[]): string | null {
  const act = activities?.find((a) => a.type === 4);
  if (!act) return null;
  const emoji = act.emoji?.name ? `${act.emoji.name} ` : "";
  const text = act.state ? `${emoji}${act.state}` : "";
  return text.trim() || null;
}

interface Props {
  onSpotifyChange?: (
    spotify: StoredSpotify | null,
    isLive: boolean,
    timestamps: { start: number; end: number } | null
  ) => void;
}

export default function LanyardStatus({ onSpotifyChange }: Props) {
  const [status, setStatus] = useState<LanyardData | null>(null);
  const onSpotifyChangeRef = useRef(onSpotifyChange);
  useEffect(() => { onSpotifyChangeRef.current = onSpotifyChange; }, [onSpotifyChange]);

  useEffect(() => {
    let mounted = true;
    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/presence/${USER_ID}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as PresenceResponse;
        if (!mounted || !payload.current) return;
        setStatus(payload.current);
      } catch {}
    };
    fetchPresence();
    const id = setInterval(fetchPresence, CLIENT_POLL_INTERVAL);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const prevSpotifyKey = useRef<string | null>(null);
  useEffect(() => {
    const cb = onSpotifyChangeRef.current;
    if (!cb) return;
    const isLive = Boolean(status?.listening_to_spotify && status.spotify);
    const sp = isLive ? status!.spotify! : null;
    const key = sp ? `${sp.track_id}:${sp.timestamps.start}` : null;
    if (key === prevSpotifyKey.current) return;
    prevSpotifyKey.current = key;
    if (sp) {
      cb({ song: sp.song, artist: sp.artist, album_art_url: sp.album_art_url, track_id: sp.track_id, seenAt: Date.now() }, true, sp.timestamps);
    } else {
      cb(null, false, null);
    }
  }, [status]);

  const activePlatforms = useMemo(() => {
    if (!status) return [];
    const p: { icon: typeof FiSmartphone; name: string }[] = [];
    if (status.active_on_discord_mobile)  p.push({ icon: FiSmartphone, name: "Mobile" });
    if (status.active_on_discord_desktop) p.push({ icon: FiMonitor,    name: "Desktop" });
    if (status.active_on_discord_web)     p.push({ icon: FiGlobe,      name: "Web" });
    return p;
  }, [status]);

  const primaryActivity = useMemo(() => {
    if (!status) return null;
    if (status.listening_to_spotify && status.spotify) return null;
    return findGameActivity(status.activities) ?? null;
  }, [status]);

  const isLiveSpotify = Boolean(status?.listening_to_spotify && status?.spotify);
  const spotifyData   = isLiveSpotify ? status!.spotify : null;
  const customStatus  = useMemo(() => getCustomStatus(status?.activities ?? []), [status?.activities]);

  const guildTag   = status?.discord_user?.clan?.tag ?? null;
  const guildBadge = status?.discord_user?.clan?.badge
    ? `https://cdn.discordapp.com/guild-tag-badges/${status.discord_user.clan.identity_guild_id}/${status.discord_user.clan.badge}.png?size=32`
    : null;

  if (!status) {
    return (
      <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="p-4 flex gap-3.5 items-start">
          <div className="h-[52px] w-[52px] rounded-full bg-white/10 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-36 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-4 py-3 flex gap-5 justify-center">
          {socials.map(({ label }) => (
            <div key={label} className="h-4 w-4 rounded bg-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const user        = status.discord_user;
  const displayName = user.global_name || user.username;
  const dotClass    = statusDotMap[status.discord_status] ?? statusDotMap.offline;
  const avatarUrl   = getDiscordAvatarUrl(user);

  const actIcon  = primaryActivity ? getActivityIcon(primaryActivity) : null;
  const actVerbs: Record<number, string> = { 0: "Playing", 1: "Streaming", 3: "Watching", 5: "Competing in" };
  const actVerb  = primaryActivity ? (actVerbs[primaryActivity.type] ?? "Playing") : null;

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="p-4 flex gap-3.5 items-start">
        <div className="relative shrink-0 h-[52px] w-[52px]">
          <img
            src={avatarUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="h-full w-full rounded-full object-cover ring-1 ring-white/10"
          />
          <span className={`absolute -bottom-0.5 -right-0.5 h-[14px] w-[14px] rounded-full border-2 border-[#0a0909] ${dotClass}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[0.92rem] font-semibold text-white leading-tight truncate">
              {displayName}
            </span>
            {activePlatforms.length > 0 && (
              <div className="flex items-center gap-0.5 opacity-40">
                {activePlatforms.map(({ icon: Icon, name }) => (
                  <Icon key={name} size={11} className="text-white" title={name} />
                ))}
              </div>
            )}
            {guildTag && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.07] border border-white/[0.1] text-white/60 leading-none">
                {guildBadge && (
                  <img src={guildBadge} alt="" width={12} height={12} className="rounded-[2px]" referrerPolicy="no-referrer" />
                )}
                {guildTag}
              </span>
            )}
          </div>

          {primaryActivity && (
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[0.72rem] text-white/50 leading-snug truncate">
                  {actVerb} {primaryActivity.name}
                </p>
                {primaryActivity.details && (
                  <p className="text-[0.68rem] text-white/35 leading-snug truncate mt-0.5">
                    {primaryActivity.details}
                  </p>
                )}
                {primaryActivity.state && (
                  <p className="text-[0.68rem] text-white/30 leading-snug truncate">
                    {primaryActivity.state}
                  </p>
                )}
              </div>
              {actIcon && (
                <img
                  src={actIcon}
                  alt={primaryActivity.name}
                  className="h-10 w-10 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          )}

          {isLiveSpotify && spotifyData && !primaryActivity && (
            <p className="mt-1 text-[0.72rem] text-white/45 truncate">
              Listening to {spotifyData.song}
            </p>
          )}

          {!primaryActivity && !isLiveSpotify && customStatus && (
            <p className="mt-1 text-[0.72rem] text-white/45 truncate">{customStatus}</p>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 -mt-1">
        <p className="text-[0.68rem] text-white/25 truncate">discord.gg/nixstudios</p>
      </div>

      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-center gap-7">
        {socials.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="text-white/30 hover:text-white transition-colors"
          >
            <Icon size={17} />
          </a>
        ))}
      </div>
    </div>
  );
}
