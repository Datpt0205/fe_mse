"use client";

import { Briefcase, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/common/EmptyState";
import JobCard from "@/components/jobs/JobCard";
import JobDetailView from "@/components/jobs/JobDetailView";
import SuggestedJobsHeader from "@/components/jobs/SuggestedJobsHeader";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchJobsFromBackend, fetchJobsFromRemotive } from "@/services/jobService";
import type { Job } from "@/types/job";

export default function JobsPanel({
  source = "backend",
  jobsOverride = null,
  externalLoading = false,
  query,
  onQueryChange,
  ocrSkills,
  onSelectJob,
  selectedJobId,
}: {
  source: "remotive" | "backend";
  jobsOverride?: Job[] | null;
  externalLoading?: boolean;
  query: string;
  onQueryChange: (s: string) => void;
  ocrSkills: string[];
  onSelectJob: (job: Job) => void;
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
  const savedSet = useMemo(() => new Set(savedJobs), [savedJobs]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [detailJob, setDetailJob] = useState<Job | null>(null);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(1);

    try {
      const list =
        source === "remotive"
          ? await fetchJobsFromRemotive(query)
          : await fetchJobsFromBackend({ q: query, location, type, seniority, minSalary });

      setJobs(list || []);
    } catch (e: any) {
      setError(e?.message || "Could not load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [location, minSalary, query, seniority, source, type]);

  useEffect(() => {
    if (jobsOverride !== null && jobsOverride !== undefined) {
      setJobs(jobsOverride);
      setError(null);
      setLoading(false);
      if (jobsOverride.length > 0) setPage(1);
      return;
    }
    loadFromApi();
  }, [jobsOverride, loadFromApi]);

  const filtered = useMemo(() => {
    let out = jobs;

    if (location) out = out.filter((j) => (j.location || "").toLowerCase().includes(location.toLowerCase()));
    if (type) out = out.filter((j) => (type === "remote" ? /remote/i.test(j.location || "") : true));

    if (minSalary && out[0]?.salary) {
      const min = Number(minSalary);
      out = out.filter((j) => {
        const n = Number(String(j.salary || "").replace(/[^0-9]/g, ""));
        return Number.isFinite(n) ? n >= min : true;
      });
    }

    if (seniority) out = out.filter((j) => (j.tags || []).join(" ").toLowerCase().includes(seniority));

    return out;
  }, [jobs, location, minSalary, seniority, type]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const isOverrideMode = !!(jobsOverride && jobsOverride.length > 0);

  const toggleSave = (id: string) => {
    setSavedJobs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCardClick = (job: Job) => {
    setDetailJob(job);
    onSelectJob(job);
  };

  if (detailJob) {
    return (
      <div className="card-elevated p-4 md:p-6">
        <JobDetailView job={detailJob} onBack={() => setDetailJob(null)} />
      </div>
    );
  }

  return (
    <div className="card-elevated p-4 md:p-6">
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
            setPage(1);

            if (!isOverrideMode) loadFromApi();
            return;
          }

          if (k === "submit") {
            if (!isOverrideMode) loadFromApi();
            return;
          }

          if (k === "query") onQueryChange(v);
          if (k === "location") setLocation(v);
          if (k === "type") setType(v);
          if (k === "seniority") setSeniority(v);
          if (k === "minSalary") setMinSalary(v ? Number(v) : undefined);
        }}
      />

      {(loading || (externalLoading && paged.length === 0)) && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border  bg-white/70 px-4 py-3 text-sm text-[hsl(220,10%,42%)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading jobs...
        </div>
      )}

      {error && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && !(externalLoading && paged.length === 0) && !error && (
        <>
          {paged.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {paged.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  selected={selectedJobId === j.id}
                  onSelect={handleCardClick}
                  saved={savedSet.has(j.id)}
                  onToggleSave={() => toggleSave(j.id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState icon={Briefcase} title="No results" desc="Try another keyword or adjust your profile filters." />
            </div>
          )}
        </>
      )}

      {paged.length < filtered.length && (
        <div className="mt-6 flex justify-center">
          <button className="btn-ghost text-sm" onClick={() => setPage((p) => p + 1)}>
            Load more
          </button>
        </div>
      )}

      {ocrSkills.length > 0 && (
        <div className="mt-5 rounded-2xl border  bg-white/65 px-4 py-3 text-xs text-[hsl(220,10%,42%)]">
          Tip: Select a job to compare it against your current profile skills in the panel on the right.
        </div>
      )}
    </div>
  );
}
