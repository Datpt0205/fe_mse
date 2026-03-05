import type { Job, RubricScores } from "@/types/job";
import { MapPin, DollarSign, Building2 } from "lucide-react";

type Props = {
  job: Job;
  selected?: boolean;
  onSelect?: (job: Job) => void;
  saved?: boolean;
  onToggleSave?: () => void;
};

/** Cycle chip colors for visual variety */
const chipStyles = ["chip-primary", "chip-accent", "chip-success", "chip-neutral"] as const;

/** Rubric dimensions to display as dots */
const RUBRIC_KEYS: { key: keyof RubricScores; label: string; emoji: string }[] = [
  { key: "skill_fit", label: "Skills", emoji: "🛠" },
  { key: "industry_fit", label: "Industry", emoji: "🏭" },
  { key: "seniority_fit", label: "Seniority", emoji: "📊" },
  { key: "salary_fit", label: "Salary", emoji: "💰" },
  { key: "benefit_fit", label: "Benefits", emoji: "🎁" },
];

/** Score 0-10 → color class */
function scoreColor(score: number): string {
  if (score >= 7) return "bg-emerald-500"; // Good fit
  if (score >= 4) return "bg-amber-400";   // Moderate fit
  return "bg-red-400";                      // Weak fit
}

/** Score 0-10 → ring glow on hover */
function scoreRing(score: number): string {
  if (score >= 7) return "ring-emerald-300";
  if (score >= 4) return "ring-amber-200";
  return "ring-red-200";
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
        "card-elevated p-4 cursor-pointer group",
        selected
          ? "ring-2 ring-[hsl(226,70%,55%)] border-transparent"
          : "hover:-translate-y-0.5",
      ].join(" ")}
      onClick={() => onSelect?.(job)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(job);
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-snug truncate text-[hsl(220,20%,14%)] group-hover:text-[hsl(226,70%,55%)] transition-colors">
            {job.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-[hsl(220,10%,42%)]">
            <Building2 className="w-3.5 h-3.5 shrink-0 opacity-50" />
            <span className="truncate">{job.company || "Unknown"}</span>
            {hasLocation && (
              <>
                <span className="opacity-30">•</span>
                <MapPin className="w-3.5 h-3.5 shrink-0 opacity-50" />
                <span className="truncate">{job.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Salary badge */}
        <div className="shrink-0">
          {hasSalary ? (
            <div className="chip chip-success">
              <DollarSign className="w-3 h-3 mr-0.5" />
              {job.salary}
            </div>
          ) : (
            <div className="chip chip-neutral text-[0.65rem]">
              Negotiable
            </div>
          )}
        </div>
      </div>

      {/* Rubric fit dots */}
      {rubric && (
        <div className="mt-3 flex items-center gap-1">
          {RUBRIC_KEYS.map(({ key, label, emoji }) => {
            const score = rubric[key] ?? 0;
            return (
              <div
                key={key}
                className="relative group/dot"
              >
                <div
                  className={`w-3 h-3 rounded-full ${scoreColor(score)} transition-all duration-200 hover:scale-150 hover:ring-2 ${scoreRing(score)} cursor-default`}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                  {emoji} {label}: {score}/10
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-gray-800" />
                </div>
              </div>
            );
          })}

          {/* Final score badge */}
          {rubric.final_score != null && (
            <div className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none ${
              rubric.final_score >= 7
                ? "bg-emerald-100 text-emerald-700"
                : rubric.final_score >= 4
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}>
              {rubric.final_score}/10
            </div>
          )}
        </div>
      )}

      {/* Skill chips */}
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
  );
}
