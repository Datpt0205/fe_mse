"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "@/components/common/SectionHeader";
import JobsPanel from "@/components/jobs/JobsPanel";
import CVUploadCard from "@/components/cv/CVUploadCard";
import AnalysisPanel from "@/components/cv/AnalysisPanel";
import SkillMatchPanel from "@/components/cv/SkillMatchPanel";
import { AlertTriangle, TrendingUp, User, Loader2, Sparkles } from "lucide-react";
import type { OcrResult } from "@/types/cv";
import type { Job } from "@/types/job";
import { cn } from "@/lib/api";
import type { UserProfile } from "@/types/profile";
import { useRouter } from "next/navigation";
import { fetchCachedRecommendations, buildRecommendPayload, requestRecommend } from "@/services/recommendService";

const DEFAULT_PROFILE: UserProfile = {
  id: "demo_user",
  industryIds: [],
  benefitTypes: [],
  skillAbbrs: [],
  targetSalaryUnit: "monthly",
  companySize: undefined,
  companySpecialities: [],
};
const PROFILE_KEY = "demo.profile.v1";
const ANALYSIS_OCR_KEY = "demo.dashboard.analysisOcr.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type Industry = { industry_id: number; industry_name: string };

export default function DashboardPage() {
  const router = useRouter();

  const [jobSource, setJobSource] = useState<"remotive" | "backend">("backend");
  const [query, setQuery] = useState("");
  const [analysisOcr, setAnalysisOcr] = useState<OcrResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [industries, setIndustries] = useState<Industry[]>([]);

  // Recommend state
  const [recommendedJobs, setRecommendedJobs] = useState<Job[] | null>(null);
  const [recsLoading, setRecsLoading] = useState(true); // start true → wait for cache check before JobsPanel fetches
  const [recsError, setRecsError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [bgRecommendRunning, setBgRecommendRunning] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("recommend.status") === "running";
  });

  const industryMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of industries) m.set(it.industry_id, it.industry_name);
    return m;
  }, [industries]);

  // Load profile + industries on mount
  useEffect(() => {
    // Load profile from server
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        if (data?.profile) setProfile({ ...DEFAULT_PROFILE, ...data.profile });
      } catch {
        // fallback to localStorage
        const p = safeParse<UserProfile>(localStorage.getItem(PROFILE_KEY), DEFAULT_PROFILE);
        setProfile(p);
      }
    })();

    // Load industries for industryMap
    (async () => {
      try {
        const res = await fetch("/api/meta/industries");
        if (res.ok) {
          const data = await res.json();
          setIndustries(data.industries || []);
        }
      } catch {}
    })();

    // Analysis OCR persistence
    const isReload = performance.getEntriesByType("navigation").some(
      (nav) => (nav as PerformanceNavigationTiming).type === "reload"
    ) || !sessionStorage.getItem("dashboard_session_active");

    if (isReload) {
      sessionStorage.removeItem(ANALYSIS_OCR_KEY);
      sessionStorage.setItem("dashboard_session_active", "true");
    }

    const savedOcr = safeParse<OcrResult | null>(sessionStorage.getItem(ANALYSIS_OCR_KEY), null);
    if (savedOcr) setAnalysisOcr(savedOcr);
  }, []);

  // Save analysisOcr to sessionStorage
  useEffect(() => {
    if (analysisOcr) {
      sessionStorage.setItem(ANALYSIS_OCR_KEY, JSON.stringify(analysisOcr));
    }
  }, [analysisOcr]);

  // Listen for profile changes from other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_KEY) {
        const next = safeParse<UserProfile>(e.newValue, DEFAULT_PROFILE);
        setProfile(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const RECS_STORAGE_KEY = "demo.dashboard.recs.v1";

  // ======= READ CACHED RECOMMENDATIONS =======
  const loadCachedRecs = async (signal?: AbortSignal) => {
    setRecsLoading(true);
    setRecsError(null);
    setIsFallback(false);

    try {
      const recs = await fetchCachedRecommendations(signal);

      if (Array.isArray(recs) && recs.length > 0) {
        setRecommendedJobs(recs);
        setIsFallback(false);
        // Persist to sessionStorage for stale-while-revalidate
        try { sessionStorage.setItem(RECS_STORAGE_KEY, JSON.stringify(recs)); } catch {}
      } else {
        // DON'T clear existing recommendedJobs — keep showing stale data
        setIsFallback(true);
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.warn("[dashboard] cache read failed:", e.message);
      // DON'T clear existing recommendedJobs
      setRecsError(e.message || "Cache read failed");
      setIsFallback(true);
    } finally {
      setRecsLoading(false);
    }
  };

  // Load cache on mount — try sessionStorage first for instant display
  useEffect(() => {
    // Restore from sessionStorage for instant stale display
    const saved = safeParse<Job[] | null>(sessionStorage.getItem(RECS_STORAGE_KEY), null);
    if (Array.isArray(saved) && saved.length > 0) {
      setRecommendedJobs(saved);
    }

    const controller = new AbortController();
    loadCachedRecs(controller.signal);
    return () => controller.abort();
  }, []);

  // If cache was empty + profile has data → trigger background recommend
  const bgRecommendFiredRef = useRef(false);
  useEffect(() => {
    if (!isFallback || bgRecommendFiredRef.current) return;

    const hasData =
      (profile.skillAbbrs?.length || 0) > 0 ||
      (profile.industryIds?.length || 0) > 0 ||
      !!profile.seniority ||
      (profile.benefitTypes?.length || 0) > 0 ||
      profile.targetSalaryMin !== undefined ||
      profile.targetSalaryMax !== undefined ||
      !!profile.companySize ||
      (profile.companySpecialities?.length || 0) > 0 ||
      !!profile.desiredTitle;

    if (!hasData) return;

    bgRecommendFiredRef.current = true;
    setBgRecommendRunning(true);
    console.log("[dashboard] no cache + profile has data → triggering background recommend");

    const payload = buildRecommendPayload(profile, industryMap, true);
    requestRecommend(payload)
      .then(() => {
        console.log("[dashboard] background recommend done");
        window.dispatchEvent(new Event("jobfit:cache-updated"));
      })
      .catch((err: any) => console.warn("[dashboard] background recommend failed:", err.message))
      .finally(() => setBgRecommendRunning(false));
  }, [isFallback, profile, industryMap]);

  // Live refresh: listen for cache updates from ProfileClient or own background call
  useEffect(() => {
    const onCacheUpdated = () => {
      console.log("[dashboard] cache updated, refreshing recommendations");
      loadCachedRecs();
    };
    window.addEventListener("jobfit:cache-updated", onCacheUpdated);
    return () => window.removeEventListener("jobfit:cache-updated", onCacheUpdated);
  }, [profile, industryMap]);

  // Poll sessionStorage to detect recommend running from Profile page
  useEffect(() => {
    const poll = setInterval(() => {
      const status = sessionStorage.getItem("recommend.status");
      if (status === "running" && !bgRecommendRunning) {
        setBgRecommendRunning(true);
        console.log("[dashboard] detected recommend running from Profile page");
      }
      if (status === "done" && bgRecommendRunning) {
        setBgRecommendRunning(false);
        console.log("[dashboard] recommend from Profile page completed, refreshing...");
        loadCachedRecs();
        sessionStorage.removeItem("recommend.status");
      }
      if (!status && bgRecommendRunning && !recsLoading) {
        setBgRecommendRunning(false);
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [bgRecommendRunning, recsLoading]);

  const profileSkills = useMemo(() => {
    const abbrs = profile?.skillAbbrs || [];
    if (abbrs.length > 0) return abbrs;

    const fallbackSkills = (profile as any)?.cv?.ocr?.skills;
    if (Array.isArray(fallbackSkills)) return fallbackSkills as string[];

    return [];
  }, [profile]);

  const hasProfileData = useMemo(() => {
    return (
      (profile?.skillAbbrs?.length || 0) > 0 ||
      (profile?.industryIds?.length || 0) > 0 ||
      !!profile?.seniority ||
      (profile?.benefitTypes?.length || 0) > 0 ||
      !!profile?.desiredTitle
    );
  }, [profile]);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 md:px-8 lg:px-10 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">JobRecs – Dashboard</h1>
          <p className="text-sm text-gray-600">
            Jobs • Analyze CV (dashboard upload) • Recommend/Match (profile)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border">
            <button
              onClick={() => setJobSource("remotive")}
              className={cn(
                "px-3 py-1.5 text-sm",
                jobSource === "remotive" ? "bg-gray-900 text-white" : "bg-white"
              )}
              type="button"
            >
              Remotive
            </button>
            <button
              onClick={() => setJobSource("backend")}
              className={cn(
                "px-3 py-1.5 text-sm",
                jobSource === "backend" ? "bg-gray-900 text-white" : "bg-white"
              )}
              type="button"
            >
              My Backend
            </button>
          </div>

          <button
            onClick={() => router.push("/profile")}
            className="px-3 py-1.5 text-sm rounded-xl border bg-white hover:bg-gray-50 flex items-center gap-1"
            type="button"
            title="Open Profile"
          >
            <User className="w-4 h-4" />
            Profile
          </button>
        </div>
      </header>

      {/* Recommend loading indicator */}
      {(recsLoading || bgRecommendRunning) && jobSource === "backend" && hasProfileData && (
        <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          <span className="text-sm text-blue-800">Loading AI-recommended jobs based on your profile...</span>
        </div>
      )}

      {/* Fallback info banner */}
      {isFallback && jobSource === "backend" && !recsLoading && (
        <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-sm text-amber-800">
              {recsError
                ? `AI recommendations unavailable (${recsError}). Showing all available jobs instead.`
                : "No matching recommendations found. Showing all available jobs instead."}
            </span>
          </div>
        </div>
      )}

      {/* Recommended badge */}
      {!recsLoading && !bgRecommendRunning && !isFallback && recommendedJobs && recommendedJobs.length > 0 && jobSource === "backend" && (
        <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800">
            Showing <b>{recommendedJobs.length}</b> AI-recommended jobs based on your profile
          </span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <JobsPanel
            source={jobSource}
            jobsOverride={
              jobSource === "backend"
                ? (recommendedJobs ?? []) // Show cached results while loading; loading banner handles UX
                : null
            }
            externalLoading={(recsLoading || bgRecommendRunning) && jobSource === "backend"}
            query={query}
            onQueryChange={setQuery}
            ocrSkills={profileSkills}
            onSelectJob={setSelectedJob}
            selectedJobId={selectedJob?.id}
          />
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <CVUploadCard onOcrDone={(res) => setAnalysisOcr(res)} allowDemo />

          <div className="border rounded-2xl p-4">
            <SectionHeader
              icon={TrendingUp}
              title="Analyze CV"
              desc="Strengths/Weaknesses + Recommended industry/role"
            />
            <AnalysisPanel ocr={analysisOcr} useBackend={true} />
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              NOTE: Upload CV here will NOT affect recommend/match. Recommend uses Profile.
            </div>
          </div>

          <div className="border rounded-2xl p-4">
            <SectionHeader
              icon={TrendingUp}
              title="Match skills with selected jobs"
              desc="Based on selected job vs skills from Profile"
            />
            <SkillMatchPanel ocrSkills={profileSkills} job={selectedJob} />
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} JobRecs Demo.
      </footer>
    </div>
  );
}
