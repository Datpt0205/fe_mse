"use client";

import { CheckCircle2, CircleDashed, Sparkles } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import type { Job } from "@/types/job";

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "match" | "neutral";
}) {
  const toneClass =
    tone === "match"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
      : " bg-white/80 text-[hsl(220,10%,42%)]";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export default function SkillMatchPanel({
  ocrSkills,
  job,
}: {
  ocrSkills: string[];
  job?: Job | null;
}) {
  const lowerSkills = ocrSkills.map((s) => s.toLowerCase());
  const jobTags = (job?.tags || []).map((s) => s.toLowerCase());
  const overlap = lowerSkills.filter((s) => jobTags.includes(s));
  const missing = jobTags.filter((s) => !overlap.includes(s)).slice(0, 8);
  const coverage = jobTags.length ? Math.round((overlap.length / jobTags.length) * 100) : 0;

  if (!job) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Select a job to compare"
        desc="Pick a role on the left to see how your current profile skills map to its tags."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.35rem] border  bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">Selected job</div>
            <div className="mt-1 text-base font-semibold text-[hsl(220,20%,14%)]">{job.title}</div>
          </div>
          <div className="rounded-full bg-[hsl(226,85%,96%)] px-3 py-1 text-sm font-semibold text-[hsl(226,65%,42%)]">
            {coverage}% match
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/90 shadow-inner">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,hsl(226,70%,55%),hsl(160,60%,45%))]"
            style={{ width: `${coverage}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(220,10%,42%)]">
          <span className="chip chip-primary">{overlap.length} matched</span>
          <span className="chip chip-accent">{missing.length} missing</span>
          <span className="chip chip-neutral">{jobTags.length} required tags</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.35rem] border  bg-white/75 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[hsl(220,20%,14%)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Matching skills
          </div>
          <div className="flex flex-wrap gap-2">
            {overlap.length > 0 ? (
              overlap.map((s) => (
                <Pill key={s} tone="match">
                  {s}
                </Pill>
              ))
            ) : (
              <span className="text-sm text-[hsl(220,10%,42%)]">No matching skills detected yet.</span>
            )}
          </div>
        </div>

        <div className="rounded-[1.35rem] border  bg-white/75 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[hsl(220,20%,14%)]">
            <CircleDashed className="h-4 w-4 text-amber-500" />
            Missing skills
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.length > 0 ? (
              missing.map((s) => <Pill key={s}>{s}</Pill>)
            ) : (
              <span className="text-sm text-[hsl(220,10%,42%)]">No gaps from the visible job tags.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
