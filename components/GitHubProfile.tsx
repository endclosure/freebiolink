"use client";

import { useEffect, useState } from "react";
import { FiBook, FiUsers, FiUserPlus, FiExternalLink } from "react-icons/fi";
import { SiGithub } from "react-icons/si";

interface GitHubProfile {
  name: string;
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  repos: number;
  followers: number;
  following: number;
}

const stats = [
  { key: "repos", label: "repos", icon: FiBook },
  { key: "followers", label: "followers", icon: FiUsers },
  { key: "following", label: "following", icon: FiUserPlus },
] as const;

export default function GitHubProfile() {
  const [profile, setProfile] = useState<GitHubProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/github/profile", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as GitHubProfile;
        if (mounted && payload?.login) setProfile(payload);
      } catch {}
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  if (!profile) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-full bg-white/10 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="mt-3.5 border-t border-white/[0.06] pt-3">
          <div className="h-7 w-full bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#f9a8d4]/30 transition-colors">
      <div className="flex items-center gap-3.5">
        <div className="relative h-11 w-11 shrink-0">
          <div className="h-full w-full rounded-full overflow-hidden ring-1 ring-white/15">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0a0909] bg-[#f5f5f5] text-black">
            <SiGithub size={9} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
          <p className="mt-0.5 text-xs text-zinc-400 truncate">@{profile.login}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {stats.map(({ key, label, icon: Icon }) => (
          <span key={key} className="flex items-center gap-1.5 text-[0.7rem] tabular-nums text-white/45">
            <Icon size={12} className="text-white/30" />
            <b className="font-semibold text-white/70">{profile[key]}</b>
            <span className="text-white/35">{label}</span>
          </span>
        ))}
      </div>

      <div className="mt-3.5 border-t border-white/[0.06] pt-3">
        <a
          href={profile.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] py-1.5 text-[0.7rem] font-medium text-white/60 hover:border-[#f9a8d4]/40 hover:text-[#f9a8d4] transition-colors"
        >
          View profile
          <FiExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
