// components/jobs/JobsPanel.tsx
"use client";
import { Loader2, Briefcase } from "lucide-react";
import JobCard from "@/components/jobs/JobCard";
import EmptyState from "@/components/common/EmptyState";
import type { Job } from "@/types/job";
import { fetchJobsFromBackend, fetchJobsFromRemotive } from "@/services/jobService";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import SuggestedJobsHeader from "@/components/jobs/SuggestedJobsHeader";

export default function JobsPanel({
  source, query, onQueryChange, ocrSkills, onSelectJob, selectedJobId
}:{
  source: "remotive" | "backend";
  query: string; onQueryChange: (s: string) => void;
  ocrSkills: string[];
  onSelectJob: (job: Job)=>void;
  selectedJobId?: string | null;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [seniority, setSeniority] = useState("");
  const [minSalary, setMinSalary] = useState<number | undefined>(undefined);

  const [savedJobs, setSavedJobs] = useLocalStorage<string[]>("sav.jobs", []);
  const [page, setPage] = useState(1);
  const savedSet = useMemo(()=> new Set(savedJobs), [savedJobs]);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setPage(1);
    try {
      const list = source === "remotive"
        ? await fetchJobsFromRemotive(query)
        : await fetchJobsFromBackend({ q: query, location, type, seniority, minSalary });
      setJobs(list);
    } catch (e: any) {
      setError(e?.message || "Lỗi tải job");
    } finally { setLoading(false); }
  }, [source, query, location, type, seniority, minSalary]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(()=>{
    let out = jobs;
    if (location) out = out.filter(j => j.location.toLowerCase().includes(location.toLowerCase()));
    if (type) out = out.filter(j => (type === "remote" ? /remote/i.test(j.location) : true));
    if (minSalary && out[0]?.salary) {
      const min = Number(minSalary);
      out = out.filter(j => {
        const n = Number(String(j.salary).replace(/[^0-9]/g, ""));
        return isFinite(n) ? n >= min : true;
      });
    }
    if (seniority) out = out.filter(j => (j.tags||[]).join(" ").toLowerCase().includes(seniority));
    return out;
  }, [jobs, location, type, seniority, minSalary]);

  const PAGE_SIZE = 12;
  const paged = filtered.slice(0, page * PAGE_SIZE);

  const toggleSave = (id: string) => {
    setSavedJobs(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  return (
    <div className="border rounded-2xl p-4 md:p-6">
      {/* NEW header + filters */}
      <SuggestedJobsHeader
        query={query}
        location={location}
        type={type}
        seniority={seniority}
        minSalary={minSalary !== undefined ? String(minSalary) : ""}
        resultCount={filtered.length}
        onChange={(k, v) => {
          if (k === "reset") {
            onQueryChange("");
            setLocation("");
            setType("");
            setSeniority("");
            setMinSalary(undefined);
            load();
            return;
          }
          if (k === "submit") { load(); return; }
          if (k === "query") onQueryChange(v);
          if (k === "location") setLocation(v);
          if (k === "type") setType(v);
          if (k === "seniority") setSeniority(v);
          if (k === "minSalary") setMinSalary(v ? Number(v) : undefined);
        }}
      />

      {loading && (
        <div className="flex items-center gap-2 text-gray-600 mt-4">
          <Loader2 className="w-4 h-4 animate-spin"/> Loading jobs...
        </div>
      )}
      {error && <div className="text-sm text-red-600 mt-4">{error}</div>}

      {!loading && !error && (
        paged.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {paged.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                selected={selectedJobId === j.id}
                onSelect={onSelectJob}
                saved={savedSet.has(j.id)}
                onToggleSave={()=>toggleSave(j.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState icon={Briefcase} title="No results" desc="Try another filter or keyword."/>
          </div>
        )
      )}

      {paged.length < filtered.length && (
        <div className="flex justify-center mt-5">
          <button className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50" onClick={()=>setPage(p=>p+1)}>Load more</button>
        </div>
      )}

      {ocrSkills.length > 0 && (
        <p className="text-xs text-gray-500 mt-4">
          Tip: Select a job to see <b>how well it matches your skills</b> in the right panel.
        </p>
      )}
    </div>
  );
}
