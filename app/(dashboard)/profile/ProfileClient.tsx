"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Loader2,
  ScanSearch,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/api";
import { extractProfileFromBackend, uploadCvToBackend } from "@/services/cvService";
import { buildRecommendPayload, requestRecommend } from "@/services/recommendService";
import type { SeniorityLevel, UserProfile } from "@/types/profile";

type Industry = { industry_id: number; industry_name: string };
type Skill = { skill_abr: string; skill_name: string };

type ExtractedProfile = {
  name?: string;
  email?: string;
  phone?: string;
  desired_title?: string;
  seniority_hint?: string;
  industry_ids?: number[];
  industry_names?: string[];
  industry_background?: string;
  skills_list?: string[];
  skill_categories?: string[];
  skill_mapping?: Record<string, string>;
};

type CvPreviewData = {
  extractedProfile: ExtractedProfile;
  mergedSkills: string[];
  fileName: string;
};

const DEFAULT_PROFILE: UserProfile = {
  id: "demo_user",
  industryIds: [],
  benefitTypes: [],
  skillAbbrs: [],
  targetSalaryUnit: "monthly",
  companySize: undefined,
  companySpecialities: [],
};

const SENIORITY_OPTIONS: Array<{ value: SeniorityLevel; label: string }> = [
  { value: "intern", label: "Intern / Fresher" },
  { value: "junior", label: "Junior (1-2y)" },
  { value: "mid", label: "Mid (2-5y)" },
  { value: "senior", label: "Senior (5y+)" },
  { value: "lead", label: "Lead / Manager" },
];

const COMPANY_SPECIALITIES = [
  { value: "Remote-first", label: "Remote-first" },
  { value: "Fast-paced", label: "Fast-paced" },
  { value: "Work-life balance", label: "Work-life balance" },
  { value: "Startup culture", label: "Startup culture" },
  { value: "Enterprise culture", label: "Enterprise culture" },
  { value: "Innovation-driven", label: "Innovation-driven" },
  { value: "Research-focused", label: "Research-focused" },
  { value: "Product-focused", label: "Product-focused" },
  { value: "Customer-centric", label: "Customer-centric" },
  { value: "Agile/Scrum", label: "Agile/Scrum" },
];

const SENIORITY_LABELS: Record<string, string> = {
  intern: "Intern / Fresher",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead / Manager",
};

export default function ProfileClient() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<string[]>([]);

  const [cvPreviewData, setCvPreviewData] = useState<CvPreviewData | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvContentType, setCvContentType] = useState<string | null>(null);
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [recommendStatus, setRecommendStatus] = useState<"idle" | "pending" | "running" | "done" | "failed">(() => {
    if (typeof window === "undefined") return "idle";
    const saved = sessionStorage.getItem("recommend.status");
    return saved === "running" || saved === "done" ? saved : "idle";
  });

  const industryMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of industries) m.set(it.industry_id, it.industry_name);
    return m;
  }, [industries]);

  const skillMap = useMemo(() => new Map(skills.map((x) => [x.skill_abr, x.skill_name])), [skills]);

  const userChangedRef = useRef(false);
  const recommendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedProfile = useRef(true);

  useEffect(() => {
    const poll = setInterval(() => {
      const stored = sessionStorage.getItem("recommend.status");
      if (stored === "done" && recommendStatus === "running") {
        setRecommendStatus("done");
        setTimeout(() => {
          setRecommendStatus("idle");
          sessionStorage.removeItem("recommend.status");
        }, 5000);
      }
      if (!stored && (recommendStatus === "running" || recommendStatus === "pending")) {
        setRecommendStatus("idle");
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [recommendStatus]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        if (data?.profile) setProfile({ ...DEFAULT_PROFILE, ...data.profile });
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [profile]);

  useEffect(() => {
    isMountedProfile.current = true;
    return () => {
      isMountedProfile.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userChangedRef.current) return;

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

    if (isMountedProfile.current) setRecommendStatus("pending");

    if (recommendTimeoutRef.current) clearTimeout(recommendTimeoutRef.current);

    recommendTimeoutRef.current = setTimeout(async () => {
      try {
        if (isMountedProfile.current) setRecommendStatus("running");
        sessionStorage.setItem("recommend.status", "running");
        const payload = buildRecommendPayload(profile, industryMap, true);
        await requestRecommend(payload);
        if (isMountedProfile.current) setRecommendStatus("done");
        sessionStorage.setItem("recommend.status", "done");
        window.dispatchEvent(new Event("jobfit:cache-updated"));
        setTimeout(() => {
          if (isMountedProfile.current) setRecommendStatus("idle");
          sessionStorage.removeItem("recommend.status");
        }, 5000);
      } catch {
        if (isMountedProfile.current) setRecommendStatus("failed");
        sessionStorage.removeItem("recommend.status");
        setTimeout(() => {
          if (isMountedProfile.current) setRecommendStatus("idle");
        }, 5000);
      }
    }, 5000);
  }, [
    profile.skillAbbrs,
    profile.industryIds,
    profile.seniority,
    profile.benefitTypes,
    profile.targetSalaryMin,
    profile.targetSalaryMax,
    profile.companySize,
    profile.companySpecialities,
    profile.desiredTitle,
    industryMap,
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/profile/cv?ts=${Date.now()}`, { method: "GET", cache: "no-store" });
        if (res.ok) {
          const ct = res.headers.get("Content-Type") || "application/pdf";
          setCvContentType(ct);
          setCvUrl(`/api/profile/cv?ts=${Date.now()}`);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [iRes, sRes, bRes] = await Promise.all([
          fetch("/api/meta/industries"),
          fetch("/api/meta/skills"),
          fetch("/api/meta/benefits"),
        ]);

        const i = iRes.ok ? await iRes.json() : { industries: [] };
        const s = sRes.ok ? await sRes.json() : { skills: [] };
        const b = bRes.ok ? await bRes.json() : { benefitTypes: [] };

        setIndustries(i.industries || []);
        setSkills(s.skills || []);
        setBenefitTypes(b.benefitTypes || []);
      } catch {
        setIndustries([]);
        setSkills([]);
        setBenefitTypes([]);
      }
    })();
  }, []);

  async function onUploadCv(file: File) {
    setIsProcessingCv(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch("/api/profile/cv", { method: "POST", body: fd }).then((r) => r.json());
      if (up?.ok) {
        setCvContentType(up.contentType || file.type);
        setCvUrl(`/api/profile/cv?ts=${Date.now()}`);
      } else {
        setCvUrl(null);
        setCvContentType(null);
      }

      const ocr = await uploadCvToBackend(file);
      const extractedProfile = await extractProfileFromBackend(ocr.text, false);

      const mergedSkills = mergeSkills(
        profile.skillAbbrs,
        extractedProfile.skills_list || ocr.skills || [],
        skills
      );

      setCvPreviewData({
        extractedProfile,
        mergedSkills,
        fileName: file.name,
      });
    } catch (error: any) {
      console.error("[profile] cv process error:", error);
      alert(
        "Failed to process CV.\n\n" +
          "The file may already be saved, but profile extraction did not complete.\n" +
          `Error: ${error?.message || "Unknown error"}`
      );
    } finally {
      setIsProcessingCv(false);
    }
  }

  async function removeCv() {
    await fetch("/api/profile/cv", { method: "DELETE" }).catch(() => {});
    setCvUrl(null);
    setCvContentType(null);
    userChangedRef.current = true;
    setProfile((p) => {
      const next: any = { ...p };
      delete next.cv;
      return next;
    });
  }

  function applyCvChanges() {
    if (!cvPreviewData) return;

    const { extractedProfile, fileName } = cvPreviewData;
    const aiTitle =
      extractedProfile.desired_title && extractedProfile.desired_title !== "Unknown"
        ? extractedProfile.desired_title
        : undefined;
    const aiIndustryIds =
      Array.isArray(extractedProfile.industry_ids) && extractedProfile.industry_ids.length > 0
        ? extractedProfile.industry_ids
        : undefined;

    userChangedRef.current = true;

    setProfile((p) => ({
      ...p,
      fullName: extractedProfile.name !== "Unknown" ? extractedProfile.name : p.fullName,
      desiredTitle: aiTitle || p.desiredTitle,
      skillAbbrs: extractedProfile.skill_categories || p.skillAbbrs,
      industryIds: aiIndustryIds || p.industryIds,
      seniority:
        extractedProfile.seniority_hint && extractedProfile.seniority_hint !== "unknown"
          ? (extractedProfile.seniority_hint as SeniorityLevel)
          : p.seniority,
      cv: { fileName, profile: extractedProfile, updatedAt: new Date().toISOString() } as any,
    }));

    setCvPreviewData(null);
  }

  function rejectCvChanges() {
    setCvPreviewData(null);
  }

  function setField<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    userChangedRef.current = true;
    setProfile((p) => ({ ...p, [k]: v }));
  }

  const cvMeta = (profile as any).cv;

  return (
    <div className="dashboard-grid relative overflow-hidden">
      <div className="hero-orb left-[-4rem] top-20 h-48 w-48 bg-blue-200/70" />
      <div className="hero-orb right-[-4rem] top-12 h-52 w-52 bg-amber-200/65" />

      <div className="relative mx-auto max-w-screen-2xl px-5 py-8 md:px-8 lg:px-10 lg:py-10">
        <section className="card-elevated relative overflow-hidden px-6 py-6 md:px-8 md:py-8">
          <div className="hero-orb right-10 top-6 h-28 w-28 bg-blue-200/80" />
          <div className="hero-orb bottom-6 right-28 h-20 w-20 bg-amber-100/80" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border  bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(226,65%,42%)]">
                <Sparkles className="h-3.5 w-3.5" />
                Profile intelligence
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-ghost inline-flex shrink-0 items-center gap-2 text-sm"
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </button>
            </div>

            <div className="mt-4 max-w-3xl">
              <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-[hsl(220,20%,14%)] md:text-5xl">
                Edit your profile so dashboard recommendations stay relevant.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[hsl(220,10%,42%)] md:text-base">
                Upload a CV for autofill, update your role and preferences, then let the recommend cache refresh in the background.
              </p>

            </div>
          </div>
        </section>

        <div className="mt-5 space-y-3">
          {recommendStatus === "pending" && (
            <StatusBanner
              tone="info"
              icon={<Sparkles className="h-4 w-4 text-blue-600" />}
              text="Profile changed. AI recommendations will refresh in about 5 seconds if you stop editing."
            />
          )}
          {recommendStatus === "running" && (
            <StatusBanner
              tone="info"
              icon={<Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              text="Running AI recommendation sync. This can take a couple of minutes."
            />
          )}
          {recommendStatus === "done" && (
            <StatusBanner
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              text="Recommendations updated. Open the dashboard to review the newest results."
            />
          )}
          {recommendStatus === "failed" && (
            <StatusBanner
              tone="danger"
              icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
              text="Recommendation sync failed. It will try again after the next profile change."
            />
          )}
        </div>

        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-7">
            <div className="card-elevated overflow-hidden p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border  bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(226,65%,42%)]">
                    <Upload className="h-3.5 w-3.5" />
                    CV workspace
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(220,20%,14%)]">
                    Upload CV for profile autofill
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(220,10%,42%)]">
                    Files uploaded here can populate profile fields and refresh recommendation data.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="btn-primary inline-flex cursor-pointer items-center gap-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Select CV
                    <input
                      className="hidden"
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadCv(f);
                      }}
                    />
                  </label>
                  <button type="button" onClick={removeCv} className="btn-ghost text-sm">
                    Remove CV
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-[1.4rem] border  bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.88))] p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(220,10%,42%)]">
                    <span className="chip chip-primary">Autofill basics</span>
                    <span className="chip chip-accent">Map skill categories</span>
                    <span className="chip chip-success">Trigger recommend sync</span>
                  </div>

                  {cvMeta?.fileName ? (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
                      <div className="text-xs uppercase tracking-[0.22em] text-emerald-700/80">Current file</div>
                      <div className="mt-1 font-medium">{cvMeta.fileName}</div>
                      {cvMeta.updatedAt && (
                        <div className="mt-1 text-xs text-emerald-700/75">
                          Updated {new Date(cvMeta.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/90 bg-white/65 px-4 py-5 text-sm text-[hsl(220,10%,42%)]">
                      No CV attached yet. Upload a file to preview it here and extract structured profile data.
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniInfo icon={<ScanSearch className="h-4 w-4" />} title="OCR" desc="Extracts raw text from your CV." />
                    <MiniInfo icon={<Brain className="h-4 w-4" />} title="AI mapping" desc="Maps skills and industry hints." />
                    <MiniInfo icon={<BriefcaseBusiness className="h-4 w-4" />} title="Recommend" desc="Refreshes dashboard cache after edits." />
                  </div>
                </div>

                <div className="rounded-[1.4rem] border  bg-white/75 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">What updates</div>
                  <ul className="mt-3 space-y-3 text-sm text-[hsl(220,10%,42%)]">
                    <li>Full name and desired title if the extractor is confident.</li>
                    <li>Seniority, industries, and skill categories for matching.</li>
                    <li>The dashboard recommendation cache after you confirm changes.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border  bg-white/65">
                <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[hsl(220,20%,14%)]">
                    <FileText className="h-4 w-4 text-[hsl(226,65%,42%)]" />
                    CV preview
                  </div>
                  <div className="text-xs text-[hsl(220,10%,42%)]">PDF, PNG, JPG supported</div>
                </div>

                <div className="h-[680px] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(248,250,252,0.9))]">
                  {cvUrl ? (
                    cvContentType?.startsWith("image/") ? (
                      <img src={cvUrl} alt="CV Preview" className="h-full w-full object-contain bg-slate-50/70" />
                    ) : (
                      <iframe title="CV Preview" src={cvUrl} className="h-full w-full" />
                    )
                  ) : (
                    <div className="grid h-full place-items-center px-6 text-center">
                      <div>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[hsl(226,65%,42%)] shadow-sm">
                          <FileText className="h-7 w-7" />
                        </div>
                        <div className="mt-4 text-base font-semibold text-[hsl(220,20%,14%)]">Preview will appear here</div>
                        <div className="mt-1 text-sm text-[hsl(220,10%,42%)]">
                          Upload a CV to inspect the file and review extracted profile changes.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-8 space-y-4">
              <ProfileTabs
                profile={profile}
                setField={setField}
                industries={industries}
                skills={skills}
                benefitTypes={benefitTypes}
                industryMap={industryMap}
                skillMap={skillMap}
              />
            </div>
          </div>
        </div>

        {cvPreviewData && (
          <CvPreviewModal
            profile={profile}
            cvPreviewData={cvPreviewData}
            skillMap={skillMap}
            onClose={rejectCvChanges}
            onApply={applyCvChanges}
          />
        )}

        {isProcessingCv && <ProcessingOverlay />}
      </div>
    </div>
  );
}

function StatusBanner({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "info" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-100 text-emerald-900"
      : tone === "danger"
        ? "border-rose-100 text-rose-900"
        : "border-blue-100 text-blue-900";

  return (
    <div className={cn("glass-banner flex items-center gap-3 rounded-2xl px-4 py-3", toneClass)}>
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  );
}

function MiniInfo({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border  bg-white/75 p-3">
      <div className="mb-2 inline-flex rounded-full bg-[hsl(226,85%,96%)] p-2 text-[hsl(226,65%,42%)]">{icon}</div>
      <div className="text-sm font-semibold text-[hsl(220,20%,14%)]">{title}</div>
      <div className="mt-1 text-xs leading-5 text-[hsl(220,10%,42%)]">{desc}</div>
    </div>
  );
}

function CvPreviewModal({
  profile,
  cvPreviewData,
  skillMap,
  onClose,
  onApply,
}: {
  profile: UserProfile;
  cvPreviewData: CvPreviewData;
  skillMap: Map<string, string>;
  onClose: () => void;
  onApply: () => void;
}) {
  const extracted = cvPreviewData.extractedProfile;

  const hasNoChanges =
    (!extracted.desired_title || extracted.desired_title === "Unknown") &&
    extracted.seniority_hint === "unknown" &&
    cvPreviewData.mergedSkills.length === 0 &&
    (!extracted.industry_ids || extracted.industry_ids.length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="card-elevated max-h-[90vh] w-full max-w-3xl overflow-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/90 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border  bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(226,65%,42%)]">
                <Sparkles className="h-3.5 w-3.5" />
                CV extraction review
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[hsl(220,20%,14%)]">
                Review extracted profile changes
              </h2>
              <p className="mt-1 text-sm text-[hsl(220,10%,42%)]">
                Confirm the fields you want to apply from <span className="font-medium">{cvPreviewData.fileName}</span>.
              </p>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost inline-flex items-center gap-2 text-sm">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {(extracted.name !== "Unknown" || extracted.email !== "Unknown" || extracted.phone !== "Unknown") && (
            <ModalSection title="Personal details" eyebrow="Detected">
              <div className="grid gap-3 md:grid-cols-3">
                {extracted.name && extracted.name !== "Unknown" && <KeyValue label="Name" value={extracted.name} />}
                {extracted.email && extracted.email !== "Unknown" && <KeyValue label="Email" value={extracted.email} />}
                {extracted.phone && extracted.phone !== "Unknown" && <KeyValue label="Phone" value={extracted.phone} />}
              </div>
            </ModalSection>
          )}

          {extracted.desired_title && extracted.desired_title !== "Unknown" && (
            <ModalSection title="Desired title" eyebrow="AI suggestion">
              <CompareRow before={profile.desiredTitle || "-"} after={extracted.desired_title} />
            </ModalSection>
          )}

          {extracted.seniority_hint && extracted.seniority_hint !== "unknown" && (
            <ModalSection title="Seniority" eyebrow="AI suggestion">
              <CompareRow
                before={profile.seniority ? SENIORITY_LABELS[profile.seniority] || profile.seniority : "-"}
                after={SENIORITY_LABELS[extracted.seniority_hint] || extracted.seniority_hint}
              />
            </ModalSection>
          )}

          {extracted.industry_ids?.length ? (
            <ModalSection title="Industries" eyebrow="Mapped from CV">
              <div className="flex flex-wrap gap-2">
                {(extracted.industry_names || []).map((name, i) => (
                  <span key={`${name}-${i}`} className="chip chip-accent">
                    {name}
                  </span>
                ))}
              </div>
              {extracted.industry_background && extracted.industry_background !== "Unknown" && (
                <div className="mt-3 text-xs text-[hsl(220,10%,42%)]">Based on: {extracted.industry_background}</div>
              )}
            </ModalSection>
          ) : null}

          {extracted.skills_list?.length ? (
            <ModalSection title="Skills profile" eyebrow="AI mapping">
              {extracted.skill_categories?.length ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220,10%,56%)]">
                    Job categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extracted.skill_categories.map((cat) => (
                      <span key={cat} className="chip chip-primary">
                        {cat} {skillMap.get(cat) ? `- ${skillMap.get(cat)}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220,10%,56%)]">
                  Technical skills
                </div>
                <div className="rounded-2xl border  bg-white/75 px-4 py-3 text-sm text-[hsl(220,10%,42%)]">
                  {extracted.skills_list.slice(0, 20).join(", ")}
                  {extracted.skills_list.length > 20 && ` ... +${extracted.skills_list.length - 20} more`}
                </div>
              </div>

              {extracted.skill_mapping && Object.keys(extracted.skill_mapping).length > 0 && (
                <details className="mt-4 rounded-2xl border  bg-white/75 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-[hsl(226,65%,42%)]">
                    View skill to category mapping
                  </summary>
                  <div className="mt-3 max-h-40 space-y-1 overflow-auto text-sm text-[hsl(220,10%,42%)]">
                    {Object.entries(extracted.skill_mapping)
                      .slice(0, 15)
                      .map(([skill, category]) => (
                        <div key={skill} className="flex gap-2">
                          <span>{skill}</span>
                          <span className="text-slate-400">-&gt;</span>
                          <span className="font-medium text-[hsl(226,65%,42%)]">{category}</span>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </ModalSection>
          ) : null}

          {hasNoChanges && (
            <div className="rounded-2xl border border-dashed  bg-white/70 px-4 py-6 text-center text-sm text-[hsl(220,10%,42%)]">
              No profile updates were extracted from this CV.
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-200/60 bg-white/90 px-6 py-4 backdrop-blur">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm">
            Keep current profile
          </button>
          <button type="button" onClick={onApply} className="btn-primary flex-1 text-sm">
            Apply extracted changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.35rem] border  bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">{eyebrow}</div>
      <h3 className="mt-1 text-base font-semibold text-[hsl(220,20%,14%)]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border  bg-white/75 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-[hsl(220,10%,56%)]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[hsl(220,20%,14%)]">{value}</div>
    </div>
  );
}

function CompareRow({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border  bg-white/75 px-4 py-3 text-sm">
      <span className="text-[hsl(220,10%,42%)]">{before}</span>
      <span className="text-slate-400">-&gt;</span>
      <span className="font-medium text-emerald-700">{after}</span>
    </div>
  );
}

function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
      <div className="card-elevated mx-4 w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(226,85%,96%)] text-[hsl(226,65%,42%)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h3 className="text-xl font-bold text-[hsl(220,20%,14%)]">Processing your CV</h3>
        <p className="mt-2 text-sm text-[hsl(220,10%,42%)]">
          Uploading, extracting text, and mapping skills. This usually takes 5 to 10 seconds.
        </p>

        <div className="mt-6 space-y-3 text-left text-sm text-[hsl(220,10%,42%)]">
          <StepRow color="bg-emerald-500" text="Uploading file to profile storage" />
          <StepRow color="bg-blue-500" text="Running OCR and text extraction" />
          <StepRow color="bg-amber-500" text="Analyzing profile signals with AI" />
        </div>
      </div>
    </div>
  );
}

function StepRow({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse", color)} />
      <span>{text}</span>
    </div>
  );
}

function ProfileTabs({
  profile,
  setField,
  industries,
  skills,
  benefitTypes,
  industryMap,
  skillMap,
}: {
  profile: UserProfile;
  setField: <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => void;
  industries: Industry[];
  skills: Skill[];
  benefitTypes: string[];
  industryMap: Map<number, string>;
  skillMap: Map<string, string>;
}) {
  const [tab, setTab] = useState<"basics" | "prefs">("basics");

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">Editable profile</div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[hsl(220,20%,14%)]">Profile settings</h2>
        </div>
        <div className="flex gap-2 rounded-2xl border  bg-white/80 p-1">
          <TabBtn active={tab === "basics"} onClick={() => setTab("basics")}>
            Basics
          </TabBtn>
          <TabBtn active={tab === "prefs"} onClick={() => setTab("prefs")}>
            Preferences
          </TabBtn>
        </div>
      </div>

      {tab === "basics" && (
        <div className="mt-5 space-y-4">
          <SectionIntro title="Basic identity" desc="These signals drive title and skill matching across the dashboard." />

          <Field label="Full name">
            <input
              value={profile.fullName || ""}
              onChange={(e) => setField("fullName", e.target.value)}
              className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
              placeholder="Example: Phung Tat Dat"
            />
          </Field>

          <Field label="Desired title">
            <input
              value={profile.desiredTitle || ""}
              onChange={(e) => setField("desiredTitle", e.target.value)}
              className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
              placeholder="Example: Backend Engineer"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Seniority">
              <select
                value={profile.seniority || ""}
                onChange={(e) =>
                  setField("seniority", (e.target.value || undefined) as SeniorityLevel | undefined)
                }
                className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
              >
                <option value="">-</option>
                {SENIORITY_OPTIONS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Salary unit">
              <select
                value={profile.targetSalaryUnit || "monthly"}
                onChange={(e) => setField("targetSalaryUnit", e.target.value as any)}
                className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
              >
                <option value="monthly">monthly</option>
                <option value="hourly">hourly</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Min salary">
              <input
                type="number"
                value={profile.targetSalaryMin ?? ""}
                onChange={(e) => setField("targetSalaryMin", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
                placeholder="Example: 2"
                min={0}
              />
            </Field>
            <Field label="Max salary">
              <input
                type="number"
                value={profile.targetSalaryMax ?? ""}
                onChange={(e) => setField("targetSalaryMax", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
                placeholder="Example: 10"
                min={0}
              />
            </Field>
          </div>

          <TagPicker<string>
            title="Skills"
            options={skills.map((s) => ({ value: s.skill_abr, label: `${s.skill_abr} - ${s.skill_name}` }))}
            selected={profile.skillAbbrs || []}
            onChange={(v) => setField("skillAbbrs", v)}
            placeholder="Search skill..."
          />
        </div>
      )}

      {tab === "prefs" && (
        <div className="mt-5 space-y-4">
          <SectionIntro title="Preferences" desc="These filters affect which jobs look strongest for your profile." />

          <TagPicker<number>
            title="Industries"
            options={industries.map((i) => ({ value: i.industry_id, label: i.industry_name }))}
            selected={profile.industryIds || []}
            onChange={(v) => setField("industryIds", v)}
            placeholder="Search industry..."
          />

          <TagPicker<string>
            title="Benefits"
            options={benefitTypes.map((t) => ({ value: t, label: t }))}
            selected={profile.benefitTypes || []}
            onChange={(v) => setField("benefitTypes", v)}
            placeholder="Search benefit..."
          />

          <Field label="Preferred company size">
            <select
              value={profile.companySize || ""}
              onChange={(e) => setField("companySize", e.target.value || undefined)}
              className="w-full rounded-xl border  bg-white/85 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">-</option>
              <option value="1-10">1-10 employees (Startup)</option>
              <option value="11-50">11-50 employees (Small)</option>
              <option value="51-200">51-200 employees (Medium)</option>
              <option value="201-500">201-500 employees (Large)</option>
              <option value="501-1000">501-1000 employees (Enterprise)</option>
              <option value="1000+">1000+ employees (Corporate)</option>
            </select>
          </Field>

          <TagPicker<string>
            title="Company culture / specialities"
            options={COMPANY_SPECIALITIES}
            selected={profile.companySpecialities || []}
            onChange={(v) => setField("companySpecialities", v)}
            placeholder="Search culture / speciality..."
          />
        </div>
      )}

      <div className="mt-5 border-t border-slate-200/60 pt-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">Live snapshot</div>
        <div className="mt-3 rounded-[1.35rem] border  bg-white/75 p-4 text-sm text-[hsl(220,10%,42%)]">
          <SnapshotRow
            label="Salary"
            value={`${profile.targetSalaryMin ?? "-"} - ${profile.targetSalaryMax ?? "-"} / ${profile.targetSalaryUnit || "monthly"}`}
          />
          <SnapshotRow
            label="Industries"
            value={(profile.industryIds || []).map((id) => industryMap.get(id) || String(id)).join(", ") || "-"}
          />
          <SnapshotRow
            label="Skills"
            value={
              (profile.skillAbbrs || [])
                .map((a) => (skillMap.get(a) ? `${a} (${skillMap.get(a)})` : a))
                .join(", ") || "-"
            }
          />
          <SnapshotRow label="Benefits" value={(profile.benefitTypes || []).join(", ") || "-"} />
          <SnapshotRow label="Company size" value={profile.companySize || "-"} />
          <SnapshotRow label="Culture" value={(profile.companySpecialities || []).join(", ") || "-"} />
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border  bg-white/70 px-4 py-3">
      <div className="text-sm font-semibold text-[hsl(220,20%,14%)]">{title}</div>
      <div className="mt-1 text-xs leading-5 text-[hsl(220,10%,42%)]">{desc}</div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <span className="font-medium text-[hsl(220,20%,14%)]">{label}:</span> {value}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-[hsl(220,20%,14%)] text-white shadow-sm"
          : "text-[hsl(220,10%,42%)] hover:text-[hsl(220,20%,14%)]"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(220,10%,56%)]">{label}</div>
      {children}
    </label>
  );
}

function mergeSkills(
  currentAbbrs: string[],
  ocrSkills: string[],
  allSkills: { skill_abr: string; skill_name: string }[]
) {
  const nameToAbr = new Map(allSkills.map((s) => [s.skill_name.toLowerCase(), s.skill_abr]));
  const set = new Set(currentAbbrs);

  for (const sk of ocrSkills) {
    const abr = nameToAbr.get(String(sk).toLowerCase());
    if (abr) set.add(abr);
  }
  return Array.from(set);
}

function TagPicker<T extends string | number>({
  title,
  options,
  selected,
  onChange,
  placeholder,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (v: T[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const selectedSet = useMemo(() => new Set(selected.map(String)), [selected]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const unselected = options.filter((o) => !selectedSet.has(String(o.value)));
    if (!qq) return unselected.slice(0, 50);

    return unselected
      .filter((o) => o.label.toLowerCase().includes(qq) || String(o.value).toLowerCase().includes(qq))
      .slice(0, 50);
  }, [q, options, selectedSet]);

  function add(v: T) {
    if (selectedSet.has(String(v))) return;
    onChange([...selected, v]);
    setQ("");
  }

  function remove(v: T) {
    onChange(selected.filter((x) => String(x) !== String(v)));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(220,10%,56%)]">{title}</div>
      <div className="rounded-[1.35rem] border  bg-white/70 p-3">
        <div className="flex min-h-[36px] flex-wrap items-center gap-2">
          {selected.length === 0 ? (
            <div className="text-xs text-[hsl(220,10%,42%)]">No selection</div>
          ) : (
            selected.slice(0, 20).map((v) => {
              const label = options.find((o) => String(o.value) === String(v))?.label ?? String(v);
              return (
                <span
                  key={String(v)}
                  className="inline-flex items-center gap-2 rounded-full border  bg-white px-3 py-1 text-xs"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white text-[10px] hover:bg-slate-50"
                    aria-label="Remove"
                    title="Remove"
                  >
                    x
                  </button>
                </span>
              );
            })
          )}
          {selected.length > 20 && <span className="text-xs text-[hsl(220,10%,42%)]">+{selected.length - 20} more</span>}

          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded-lg border  bg-white px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            disabled={selected.length === 0}
          >
            Clear
          </button>
        </div>

        <div className="relative mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full rounded-xl border  bg-white px-3 py-2.5 text-sm outline-none"
            placeholder={placeholder || "Search..."}
          />

          {isFocused && filtered.length > 0 && (
            <div className="mt-2 max-h-[220px] overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filtered.map((o, idx) => (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => add(o.value)}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:outline-none",
                    idx !== filtered.length - 1 && "border-b border-slate-100"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {isFocused && q.trim() && filtered.length === 0 && (
            <div className="mt-2 text-xs text-[hsl(220,10%,42%)]">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
