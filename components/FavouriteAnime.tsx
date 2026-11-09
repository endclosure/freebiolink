import { FiArrowUpRight } from "react-icons/fi";
import { favouriteAnime } from "@/app/lib/about";

export default function FavouriteAnime() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {favouriteAnime.map((anime, index) => (
        <a
          key={anime.title}
          href={anime.href}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-[#f9a8d4]/40 hover:bg-white/[0.05]"
        >
          <div className="relative h-32 w-[5.5rem] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/10">
            <img
              src={anime.cover}
              alt={anime.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{ backgroundImage: `linear-gradient(to top, ${anime.accent}40, transparent)` }}
            />
          </div>

          <div className="min-w-0 text-left">
            <p className="text-[0.6rem] tabular-nums uppercase tracking-[0.2em] text-white/25">
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-1.5 text-[0.86rem] font-semibold leading-snug text-white">{anime.title}</p>
            <p className="mt-1 line-clamp-1 text-[0.7rem] text-white/35">{anime.japanese}</p>
            <span className="mt-2.5 inline-flex items-center gap-1 text-[0.65rem] text-white/30 transition-colors group-hover:text-[#f9a8d4]">
              view on anilist
              <FiArrowUpRight size={11} />
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
