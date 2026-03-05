"use client";

import { ArrowLeft, Building2, MapPin, DollarSign, Users, Briefcase, Star } from "lucide-react";
import type { Job, RubricScores } from "@/types/job";

const RUBRIC_KEYS: { key: keyof RubricScores; label: string; emoji: string }[] = [
  { key: "skill_fit", label: "Skills Match", emoji: "🛠" },
  { key: "industry_fit", label: "Industry Fit", emoji: "🏭" },
  { key: "seniority_fit", label: "Seniority Fit", emoji: "📊" },
  { key: "salary_fit", label: "Salary Fit", emoji: "💰" },
  { key: "benefit_fit", label: "Benefits Fit", emoji: "🎁" },
];

function scoreColor(score: number) {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 4) return "bg-amber-400";
  return "bg-red-400";
}

function scoreBadge(score: number) {
  if (score >= 7) return "bg-emerald-100 text-emerald-700";
  if (score >= 4) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

type Props = {
  job: Job;
  onBack: () => void;
};

export default function JobDetailView({ job, onBack }: Props) {
  const rubric = job.rubric;
  const hasSalary = job.salary && job.salary !== "Unknown";
  const hasLocation = job.location && job.location !== "Unknown";
  const desc = job.job_description || "";
  const chips = (job.tags?.length ? job.tags : job.skills)?.slice(0, 12) ?? [];
  const benefits = job.benefits ?? [];
  const companyIndustries = job.company_industries ?? [];
  const companySpecs = job.company_specialities ?? [];

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[hsl(226,70%,55%)] hover:text-[hsl(226,70%,45%)] transition-colors font-medium"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to jobs
      </button>

      {/* Header card */}
      <div className="card-elevated p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-[hsl(220,20%,14%)] leading-tight">
              {job.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-[hsl(220,10%,42%)]">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-4 h-4 opacity-50" />
                {job.company || "Unknown"}
              </span>
              {hasLocation && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4 opacity-50" />
                  {job.location}
                </span>
              )}
              {job.employee_bucket && job.employee_bucket !== "Unknown" && (
                <span className="inline-flex items-center gap-1">
                  <Users className="w-4 h-4 opacity-50" />
                  {job.employee_bucket}
                </span>
              )}
            </div>
          </div>

          {/* Salary */}
          <div className="shrink-0">
            {hasSalary ? (
              <div className="chip chip-success text-sm">
                <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                {job.salary}
              </div>
            ) : (
              <div className="chip chip-neutral text-xs">Negotiable</div>
            )}
          </div>
        </div>

        {/* Rubric scores */}
        {rubric && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-[hsl(220,20%,22%)]">Fit Score</span>
              {rubric.final_score != null && (
                <span className={`px-2 py-0.5 text-sm font-bold rounded-lg ${scoreBadge(rubric.final_score)}`}>
                  {rubric.final_score}/10
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {RUBRIC_KEYS.map(({ key, label, emoji }) => {
                const score = rubric[key] ?? 0;
                return (
                  <div key={key} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{emoji} {label}</div>
                    <div className="flex items-center justify-center gap-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${scoreColor(score)}`} />
                      <span className="text-sm font-semibold text-[hsl(220,20%,22%)]">{score}/10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tags / Skills */}
      {chips.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="text-sm font-semibold text-[hsl(220,20%,22%)] mb-2 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 opacity-60" />
            Required Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((t, i) => (
              <span key={t} className={`chip ${["chip-primary", "chip-accent", "chip-success", "chip-neutral"][i % 4]}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Company info */}
      {(companyIndustries.length > 0 || companySpecs.length > 0 || (benefits.length > 0 && benefits[0] !== "Unknown")) && (
        <div className="card-elevated p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[hsl(220,20%,22%)]">Company Info</h3>

          {companyIndustries.length > 0 && companyIndustries[0] !== "Unknown" && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Industries</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {companyIndustries.map((t) => (
                  <span key={t} className="chip chip-neutral">{t}</span>
                ))}
              </div>
            </div>
          )}

          {companySpecs.length > 0 && companySpecs[0] !== "Unknown" && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Specialities</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {companySpecs.map((t) => (
                  <span key={t} className="chip chip-neutral">{t}</span>
                ))}
              </div>
            </div>
          )}

          {benefits.length > 0 && benefits[0] !== "Unknown" && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Benefits</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {benefits.map((t) => (
                  <span key={t} className="chip chip-success">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job Description */}
      {desc && desc !== "Unknown" && (
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-[hsl(220,20%,22%)] mb-3">Job Description</h3>
          <div className="prose prose-sm max-w-none text-[hsl(220,10%,32%)] leading-relaxed whitespace-pre-wrap break-words">
            {desc}
          </div>
        </div>
      )}
    </div>
  );
}
