import type { Job, RubricScores } from "@/types/job";
import { ArrowUpRight, Building2, DollarSign, MapPin } from "lucide-react";

type Props = {
  job: Job;
  selected?: boolean;
  onSelect?: (job: Job) => void;
  saved?: boolean;
  onToggleSave?: () => void;
};

const chipStyles = ["chip-primary", "chip-accent", "chip-success", "chip-neutral"] as const;

const RUBRIC_KEYS: { key: keyof RubricScores; label: string }[] = [
  { key: "skill_fit", label: "Skills" },
  { key: "industry_fit", label: "Industry" },
  { key: "seniority_fit", label: "Seniority" },
  { key: "salary_fit", label: "Salary" },
  { key: "benefit_fit", label: "Benefits" },
];

function scoreColor(score: number): string {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 4) return "bg-amber-400";
  return "bg-rose-400";
}

function scoreRing(score: number): string {
  if (score >= 7) return "ring-emerald-300";
  if (score >= 4) return "ring-amber-200";
  return "ring-rose-200";
}

export default function JobCard({
  job,
  selected = false,
  onSelect,
  saved = false,
  onToggleSave,
}: Props) {
  const chips = (job.tags?.length ? job.tags : job.skills)?.slice(0, 6) ?? [];
  const hasSalary = job.salary && job.salary !== "Unknown";
  const hasLocation = job.location && job.location !== "Unknown";
  const rubric = job.rubric;

  return (
    <div
      className={[
        "card-elevated relative overflow-hidden p-3 cursor-pointer group",
        selected
          ? "border-transparent ring-2 ring-[hsl(226,70%,55%)] shadow-[0_24px_40px_-24px_rgba(59,130,246,0.45)]"
          : "hover:-translate-y-0.5",
      ].join(" ")}
      onClick={() => onSelect?.(job)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(job);
      }}
    >
      <div className="hero-orb -right-4 top-0 h-12 w-12 bg-blue-200/70" />
      <div className="hero-orb bottom-0 left-4 h-10 w-10 bg-amber-100/80" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-[15px] font-semibold leading-snug text-[hsl(220,20%,14%)] transition-colors group-hover:text-[hsl(226,70%,55%)]">
                {job.title}
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[hsl(220,10%,56%)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[hsl(220,10%,42%)]">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">{job.company || "Unknown company"}</span>
              </span>
              {hasLocation && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{job.location}</span>
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {hasSalary ? (
              <div className="chip chip-success">
                <DollarSign className="mr-0.5 h-3 w-3" />
                {job.salary}
              </div>
            ) : (
              <div className="chip chip-neutral text-[0.65rem]">Negotiable</div>
            )}
          </div>
        </div>

        {rubric && (
          <div className="mt-3 rounded-xl border border-white/70 bg-white/65 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220,10%,56%)]">
                Match rubric
              </div>
              {rubric.final_score != null && (
                <div
                  className={[
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    rubric.final_score >= 7
                      ? "bg-emerald-100 text-emerald-700"
                      : rubric.final_score >= 4
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700",
                  ].join(" ")}
                >
                  {rubric.final_score}/10
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {RUBRIC_KEYS.map(({ key, label }) => {
                const score = rubric[key] ?? 0;
                return (
                  <div key={key} className="relative group/dot">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${scoreColor(score)} cursor-default transition-all duration-200 hover:scale-150 hover:ring-2 ${scoreRing(score)}`}
                    />
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-md bg-gray-800 px-2 py-1 text-[10px] font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover/dot:opacity-100">
                      {label}: {score}/10
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((t, i) => (
              <span key={t} className={`chip ${chipStyles[i % chipStyles.length]}`}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
