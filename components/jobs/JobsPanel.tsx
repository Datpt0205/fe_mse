"use client";

import { Loader2, Briefcase } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";

import JobCard from "@/components/jobs/JobCard";
import JobDetailView from "@/components/jobs/JobDetailView";
import EmptyState from "@/components/common/EmptyState";
import SuggestedJobsHeader from "@/components/jobs/SuggestedJobsHeader";

import type { Job } from "@/types/job";
import { fetchJobsFromBackend, fetchJobsFromRemotive } from "@/services/jobService";
import { useLocalStorage } from "@/hooks/useLocalStorage";

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

  // Detail view state
  const [detailJob, setDetailJob] = useState<Job | null>(null);

  // ---------- Load from API (ONLY when not overridden) ----------
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
      setError(e?.message || "Lỗi tải job");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [source, query, location, type, seniority, minSalary]);

  // ---------- If jobsOverride is provided (even empty []) => use it and DO NOT fetch ----------
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

  // ---------- Filters in-memory ----------
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
  }, [jobs, location, type, seniority, minSalary]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const toggleSave = (id: string) => {
    setSavedJobs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isOverrideMode = !!(jobsOverride && jobsOverride.length > 0);

  const handleCardClick = (job: Job) => {
    setDetailJob(job);
    onSelectJob(job);
  };

  // ========== DETAIL VIEW ==========
  if (detailJob) {
    return (
      <div className="card-elevated p-4 md:p-6">
        <JobDetailView
          job={detailJob}
          onBack={() => setDetailJob(null)}
        />
      </div>
    );
  }

  // ========== LIST VIEW ==========
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
        <div className="flex items-center gap-2 text-[hsl(220,10%,56%)] mt-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading jobs...
        </div>
      )}

      {error && <div className="text-sm text-red-600 mt-4">{error}</div>}

      {!loading && !(externalLoading && paged.length === 0) && !error && (
        paged.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
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
            <EmptyState icon={Briefcase} title="No results" desc="Try another filter or keyword." />
          </div>
        )
      )}

      {paged.length < filtered.length && (
        <div className="flex justify-center mt-5">
          <button
            className="btn-ghost text-sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Load more
          </button>
        </div>
      )}

      {ocrSkills.length > 0 && (
        <p className="text-xs text-[hsl(220,10%,56%)] mt-4">
          Tip: Select a job to see <b>how well it matches your skills</b> in the right panel.
        </p>
      )}
    </div>
  );
}
