// components/jobs/SuggestedJobsHeader.tsx
"use client";
import { Search, SlidersHorizontal, MapPin, Briefcase, Info } from "lucide-react";

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
  query, location="", type="", seniority="", minSalary="", resultCount=0, onChange
}: Props) {
  return (
    <section>
      {/* Top row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(220,20%,14%)]">
            Suggested Jobs
          </h2>
          <p className="text-[hsl(220,10%,56%)] text-sm mt-0.5">
            Personalized recommendations based on your profile
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[hsl(220,10%,42%)]">
          <div className="flex items-center gap-1.5 chip chip-primary">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-semibold">{resultCount}</span>
            <span>results</span>
          </div>
        </div>
      </div>

      {/* Rubric Legend */}
      <details className="mt-3 group/legend">
        <summary className="text-xs text-[hsl(220,10%,56%)] cursor-pointer hover:text-[hsl(226,70%,55%)] transition-colors select-none flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>What do the colored dots mean?</span>
        </summary>
        <div className="mt-2 p-3 bg-[hsl(220,20%,97%)] rounded-xl border border-[hsl(220,20%,90%)] text-xs space-y-2">
          {/* Color scale */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[hsl(220,10%,42%)]">Good fit (7-10)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="text-[hsl(220,10%,42%)]">Moderate (4-6)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span className="text-[hsl(220,10%,42%)]">Weak fit (0-3)</span>
            </div>
          </div>
          {/* Dimensions */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[hsl(220,10%,50%)]">
            <span>🛠 Skills</span>
            <span>🏭 Industry</span>
            <span>📊 Seniority</span>
            <span>💰 Salary</span>
            <span>🎁 Benefits</span>
          </div>
          <p className="text-[10px] text-[hsl(220,10%,60%)] leading-relaxed">
            Each dot represents how well the job matches your profile in that dimension. Hover over any dot for details.
          </p>
        </div>
      </details>

      {/* Search + filters */}
      <div className="mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Query */}
          <div className="col-span-1 lg:col-span-2">
            <div className="input-field">
              <Search className="w-4 h-4 text-[hsl(220,10%,56%)] shrink-0" />
              <input
                value={query}
                onChange={(e) => onChange("query", e.target.value)}
                placeholder="Search by keyword (e.g. software, data, QA...)"
                className="w-full bg-transparent outline-none placeholder:text-[hsl(220,10%,70%)] text-sm"
              />
            </div>
          </div>

          {/* Min salary */}
          <div className="col-span-1">
            <div className="input-field">
              <Briefcase className="w-4 h-4 text-[hsl(220,10%,56%)] shrink-0" />
              <input
                value={minSalary}
                onChange={(e)=>onChange("minSalary", e.target.value)}
                placeholder="Min salary"
                inputMode="numeric"
                className="w-full bg-transparent outline-none placeholder:text-[hsl(220,10%,70%)] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={()=>onChange("submit","1")}
            className="btn-primary text-sm"
          >
            Apply filters
          </button>
          <button
            onClick={()=>onChange("reset","1")}
            className="btn-ghost text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
