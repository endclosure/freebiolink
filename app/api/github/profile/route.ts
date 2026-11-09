import { NextResponse } from "next/server";

export const revalidate = 3600;

const USERNAME = "endclosure";

interface GitHubProfile {
  name: string;
  login: string;
  avatarUrl: string;
  bio: string;
  htmlUrl: string;
  repos: number;
  followers: number;
  following: number;
}

const FALLBACK: GitHubProfile = {
  name: "「Catboy Fbi」∧︵∧",
  login: "endclosure",
  avatarUrl: "https://avatars.githubusercontent.com/u/242625464?v=4",
  bio: "hello, i am a bot developer for discord i normally analyze malware and expose them.\n\ni help analyze malware with @trenjamin when needed",
  htmlUrl: "https://github.com/endclosure",
  repos: 23,
  followers: 7,
  following: 3,
};

export async function GET() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-site",
  };

  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.length > 0) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/users/${USERNAME}`, {
      headers,
      next: { revalidate },
    });

    if (!res.ok) {
      return NextResponse.json(FALLBACK);
    }

    const user = await res.json();

    const body: GitHubProfile = {
      name: user.name || user.login,
      login: user.login,
      avatarUrl: user.avatar_url,
      bio: (user.bio ?? "").replace(/\r\n/g, "\n"),
      htmlUrl: user.html_url,
      repos: user.public_repos ?? 0,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
    };

    return NextResponse.json(body);
  } catch (e) {
    console.error("Error fetching GitHub profile:", e);
    return NextResponse.json(FALLBACK);
  }
}
