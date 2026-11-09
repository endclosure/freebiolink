import { bioParagraphs, quickFacts } from "@/app/lib/about";

export default function AboutMe() {
  return (
    <div className="grid grid-cols-1 gap-4 text-left lg:grid-cols-[1.45fr_0.55fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#f9a8d4]/25 sm:p-7">
        <div className="space-y-3.5 text-[0.86rem] leading-relaxed text-white/55">
          {bioParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
        <p className="mb-4 text-[0.65rem] uppercase tracking-[0.2em] text-white/30">Quick facts</p>
        <dl className="space-y-3">
          {quickFacts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-[0.78rem] text-white/35">{fact.label}</dt>
              <dd className="text-right text-[0.82rem] font-medium text-white/75">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
