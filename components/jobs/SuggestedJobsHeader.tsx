"use client";

import { Briefcase, Info, Search, Sparkles } from "lucide-react";

type Props = {
  query: string;
  location?: string;
  type?: string;
  seniority?: string;
  minSalary?: string;
  resultCount?: number;
  onChange: (k: string, v: string) => void;
};

export default function SuggestedJobsHeader({
  query,
  location = "",
  type = "",
  seniority = "",
  minSalary = "",
  resultCount = 0,
  onChange,
}: Props) {
  const activeFilters = [query, location, type, seniority, minSalary].filter(Boolean).length;

  return (
    <section>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(226,65%,42%)] md:text-3xl">
            Suggested Jobs
          </h2>

        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border  bg-white/75 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">Results</div>
            <div className="mt-1 text-2xl font-semibold text-[hsl(220,20%,14%)]">{resultCount}</div>
          </div>
          <div className="rounded-2xl border  bg-white/75 px-4 py-3 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">Active filters</div>
            <div className="mt-1 text-2xl font-semibold text-[hsl(220,20%,14%)]">{activeFilters}</div>
          </div>
        </div>
      </div>

      <details className="group/legend mt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-[hsl(220,10%,42%)] transition-colors hover:text-[hsl(226,70%,55%)]">
          <Info className="h-4 w-4" />
          What do the colored dots mean?
        </summary>
        <div className="mt-3 rounded-2xl border  bg-white/75 p-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[hsl(220,10%,42%)]">Good fit (7-10)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="text-[hsl(220,10%,42%)]">Moderate (4-6)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="text-[hsl(220,10%,42%)]">Weak fit (0-3)</span>
            </div>
          </div>
          <p className="mt-3 leading-5 text-[hsl(220,10%,42%)]">
            Dots score skill, industry, seniority, salary, and benefit fit. Hover a dot on any card to inspect that dimension.
          </p>
        </div>
      </details>

      <div className="mt-5 rounded-[1.5rem] border  bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.85))] p-4 shadow-[0_18px_28px_-26px_rgba(15,23,42,0.35)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_auto]">
          <div className="input-field">
            <Search className="h-4 w-4 shrink-0 text-[hsl(220,10%,56%)]" />
            <input
              value={query}
              onChange={(e) => onChange("query", e.target.value)}
              placeholder="Search by keyword, title, or stack"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(220,10%,70%)]"
            />
          </div>

          <div className="input-field">
            <Briefcase className="h-4 w-4 shrink-0 text-[hsl(220,10%,56%)]" />
            <input
              value={minSalary}
              onChange={(e) => onChange("minSalary", e.target.value)}
              placeholder="Min salary"
              inputMode="numeric"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(220,10%,70%)]"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => onChange("submit", "1")} className="btn-primary text-sm">
              Apply filters
            </button>
            <button onClick={() => onChange("reset", "1")} className="btn-ghost text-sm">
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[hsl(220,10%,42%)]">
          {query && <span className="chip chip-primary">Keyword: {query}</span>}
          {minSalary && <span className="chip chip-accent">Salary {"\u003e="} {minSalary}</span>}
          {!query && !minSalary && <span className="chip chip-neutral">No filters applied</span>}
        </div>
      </div>
    </section>
  );
}
