// components/jobs/SuggestedJobsHeader.tsx
"use client";
import { Search, SlidersHorizontal, MapPin, Briefcase, GraduationCap, ChevronDown } from "lucide-react";
import { cn } from "@/lib/api";

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
    <section className="rounded-2xl border bg-white px-5 py-5 md:px-8 md:py-6">
      {/* top row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Suggested jobs</h2>
          <p className="text-gray-500 text-sm">Remotive (demo)</p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
          <SlidersHorizontal className="w-4 h-4" />
          <span><span className="font-medium">{resultCount}</span> results</span>
        </div>
      </div>

      {/* search + filters */}
      <div className="mt-4 md:mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Query */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2 focus-within:ring-gray-900/10">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={query}
                onChange={(e) => onChange("query", e.target.value)}
                placeholder="Search by keyword (e.g. software, data, QA...)"
                className="w-full bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Location */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2 focus-within:ring-gray-900/10">
              <MapPin className="w-4 h-4 text-gray-500" />
              <input
                value={location}
                onChange={(e)=>onChange("location", e.target.value)}
                placeholder="Location"
                className="w-full bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Type */}
          {/* <div className="col-span-1">
            <div className="relative">
              <select
                value={type}
                onChange={(e)=>onChange("type", e.target.value)}
                className={cn(
                  "w-full appearance-none rounded-xl border bg-white px-3 py-2.5 pr-8",
                  "focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                )}
              >
                <option value="">Type</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>
          </div> */}

          {/* Seniority */}
          {/* <div className="col-span-1">
            <div className="relative">
              <select
                value={seniority}
                onChange={(e)=>onChange("seniority", e.target.value)}
                className="w-full appearance-none rounded-xl border bg-white px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              >
                <option value="">Experience</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
              <GraduationCap className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>
          </div> */}

          {/* Min salary */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2 focus-within:ring-gray-900/10">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <input
                value={minSalary}
                onChange={(e)=>onChange("minSalary", e.target.value)}
                placeholder="Min salary"
                inputMode="numeric"
                className="w-full bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={()=>onChange("submit","1")}
            className="rounded-xl bg-gray-900 text-white px-4 py-2.5 hover:opacity-90 transition"
          >
            Apply filters
          </button>
          <button
            onClick={()=>onChange("reset","1")}
            className="rounded-xl border px-4 py-2.5 bg-white hover:bg-gray-50 transition"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
