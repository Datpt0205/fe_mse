"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, User } from "lucide-react";
import type { UserProfile, SeniorityLevel } from "@/types/profile";
import { uploadCvToBackend, extractProfileFromBackend } from "@/services/cvService";
import { buildRecommendPayload, requestRecommend } from "@/services/recommendService";
import { useRouter } from "next/navigation";

type Industry = { industry_id: number; industry_name: string };
type Skill = { skill_abr: string; skill_name: string };

const DEFAULT_PROFILE: UserProfile = {
  id: "demo_user",
  industryIds: [],
  benefitTypes: [],
  skillAbbrs: [],
  targetSalaryUnit: "monthly" as any,
  companySize: undefined,
  companySpecialities: [],
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function ProfileClient() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // meta
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<string[]>([]);
  
  // CV Preview Modal state
  const [cvPreviewData, setCvPreviewData] = useState<{
    extractedProfile: any;
    mergedSkills: string[];
    fileName: string;
  } | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvContentType, setCvContentType] = useState<string | null>(null);
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [recommendStatus, setRecommendStatus] = useState<"idle" | "pending" | "running" | "done" | "failed">(() => {
    if (typeof window === "undefined") return "idle";
    const saved = sessionStorage.getItem("recommend.status");
    return (saved === "running" || saved === "done") ? saved : "idle";
  });

  // Poll sessionStorage to detect status changes from async IIFE after navigation
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

  const industryMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of industries || []) m.set(it.industry_id, it.industry_name);
    return m;
  }, [industries]);

  const skillMap = useMemo(() => new Map(skills.map((x) => [x.skill_abr, x.skill_name])), [skills]);

  // ===== Load profile from server file (/api/profile) once =====
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        if (data?.profile) setProfile({ ...DEFAULT_PROFILE, ...data.profile });
      } catch {
        // ignore
      }
    })();
  }, []);




  // ===== Autosave profile to server file (debounce) =====
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

  // ===== Track user-initiated profile changes (skip initial load) =====
  const userChangedRef = useRef(false);
  const recommendTimeoutRef = useRef<any>(null);
  const isMountedProfile = useRef(true);

  useEffect(() => {
    isMountedProfile.current = true;
    return () => { isMountedProfile.current = false; };
  }, []);

  // Background recommend: ONLY trigger on real user changes
  useEffect(() => {
    if (!userChangedRef.current) return; // Skip initial load / mount

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
    console.log("[profile] profile changed, recommend will fire in 5s...");

    if (recommendTimeoutRef.current) clearTimeout(recommendTimeoutRef.current);

    // Debounce 5s after profile change to avoid spamming
    recommendTimeoutRef.current = setTimeout(async () => {
      try {
        if (isMountedProfile.current) setRecommendStatus("running");
        sessionStorage.setItem("recommend.status", "running");
        console.log("[profile] 5s debounce elapsed, firing recommend now...");
        // force_refresh=true → always recompute after user edits
        const payload = buildRecommendPayload(profile, industryMap, true);
        await requestRecommend(payload);
        console.log("[profile] background recommend cached successfully");
        if (isMountedProfile.current) setRecommendStatus("done");
        sessionStorage.setItem("recommend.status", "done");
        // Notify Dashboard to live-refresh
        window.dispatchEvent(new Event("jobfit:cache-updated"));
        // Reset status after 5s
        setTimeout(() => {
          if (isMountedProfile.current) setRecommendStatus("idle");
          sessionStorage.removeItem("recommend.status");
        }, 5000);
      } catch (e: any) {
        console.warn("[profile] background recommend failed:", e.message);
        if (isMountedProfile.current) setRecommendStatus("failed");
        sessionStorage.removeItem("recommend.status");
        setTimeout(() => {
          if (isMountedProfile.current) setRecommendStatus("idle");
        }, 5000);
      }
    }, 5000);

    return () => {
      // DON'T clear timeout here because unmount shouldn't cancel the sync
    };
  }, [
    profile.skillAbbrs, profile.industryIds, profile.seniority,
    profile.benefitTypes, profile.targetSalaryMin, profile.targetSalaryMax,
    profile.companySize, profile.companySpecialities, profile.desiredTitle,
    industryMap,
  ]);

    // load persisted CV if exists
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

  // ===== Fetch meta =====
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

        console.log("[DEBUG] Meta API loaded:", {
          industries: i.industries?.length || 0,
          skills: s.skills?.length || 0,
          benefits: b.benefitTypes?.length || 0
        });

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
    setIsProcessingCv(true); // Start loading
    try {
      // Persist CV to server (supports PDF, PNG, JPG)
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

      // OCR and extract data
      const ocr = await uploadCvToBackend(file);
      const extractedProfile = await extractProfileFromBackend(ocr.text, false);

      const mergedSkills = mergeSkills(
        profile.skillAbbrs,
        extractedProfile.skills_list || ocr.skills || [],
        skills
      );

      // Show modal with extracted data
      setCvPreviewData({
        extractedProfile,
        mergedSkills,
        fileName: file.name,
      });
    } catch (error: any) {
      console.error("[onUploadCv] Error:", error);
      alert(
        "❌ Failed to process CV\n\n" +
        "The CV file has been saved, but we couldn't extract data from it.\n" +
        `Error: ${error.message || "Unknown error"}\n\n` +
        "You can still manually fill in your profile information."
      );
    } finally {
      setIsProcessingCv(false); // Stop loading
    }
  }

  function applyCvChanges() {
    if (!cvPreviewData) return;

    const { extractedProfile, fileName } = cvPreviewData;

    const aiTitle = extractedProfile.desired_title && extractedProfile.desired_title !== "Unknown" 
      ? extractedProfile.desired_title 
      : undefined;

    const aiIndustryIds = Array.isArray(extractedProfile.industry_ids) && extractedProfile.industry_ids.length > 0
      ? extractedProfile.industry_ids
      : undefined;

    // Explicitly mark as user-initiated change so recommend debounce will fire
    userChangedRef.current = true;

    setProfile((p) => ({
      ...p,
      fullName: extractedProfile.name !== "Unknown" ? extractedProfile.name : p.fullName,
      desiredTitle: aiTitle || p.desiredTitle,
      skillAbbrs: extractedProfile.skill_categories || p.skillAbbrs,
      industryIds: aiIndustryIds || p.industryIds,
      seniority: extractedProfile.seniority_hint !== "unknown" 
        ? extractedProfile.seniority_hint 
        : p.seniority,
      cv: { fileName, profile: extractedProfile, updatedAt: new Date().toISOString() } as any,
    }));

    setCvPreviewData(null); // Close modal

    // The `userChangedRef.current = true` above will trigger the 30s debounce
    // process so we don't need to manually call requestRecommend immediately here.
  }

  function rejectCvChanges() {
    setCvPreviewData(null); // Close modal, CV is already saved but profile not updated
  }

  function setField<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    userChangedRef.current = true;
    setProfile((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 md:px-8 lg:px-10 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" /> Profile
          </h1>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="px-3 py-1.5 text-sm rounded-xl border bg-white hover:bg-gray-50"
          type="button"
        >
          Back to Dashboard
        </button>
      </header>

      {/* Recommend status indicator */}
      {recommendStatus === "pending" && (
        <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-blue-800">Profile changed — recommendations will refresh in ~30s...</span>
        </div>
      )}
      {recommendStatus === "running" && (
        <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-blue-800">Running AI recommendation... (this may take 2-3 min)</span>
        </div>
      )}
      {recommendStatus === "done" && (
        <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 flex items-center gap-3">
          <span className="text-sm text-green-800">✅ Recommendations updated! Go to Dashboard to see new results.</span>
        </div>
      )}
      {recommendStatus === "failed" && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <span className="text-sm text-red-800">❌ Recommend failed. Will retry on next profile change.</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Upload CV (Profile)</div>
                <div className="text-xs text-gray-500">Upload ở đây sẽ dùng cho recommend + autofill fields</div>
              </div>
                <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 cursor-pointer inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Select CV
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
                    <button
                        type="button"
                        onClick={async () => {
                            await fetch("/api/profile/cv", { method: "DELETE" }).catch(() => {});
                            setCvUrl(null);
                            setCvContentType(null);
                            userChangedRef.current = true;
                            setProfile((p) => {
                            const next: any = { ...p };
                            delete next.cv;
                            return next;
                            });
                        }}
                        className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                        >
                        Remove CV
                    </button>
                </div>
            </div>

            {(profile as any).cv?.fileName && (
              <div className="mt-3 text-sm text-gray-700">
                Current CV: <b>{(profile as any).cv.fileName}</b>
                {(profile as any).cv.updatedAt && (
                  <span className="text-xs text-gray-500">
                    {" "}
                    • {new Date((profile as any).cv.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 border rounded-xl overflow-hidden h-[680px]">
              {cvUrl ? (
                cvContentType?.startsWith("image/") ? (
                  <img
                    src={cvUrl}
                    alt="CV Preview"
                    className="w-full h-full object-contain bg-gray-50"
                  />
                ) : (
                  <iframe title="CV Preview" src={cvUrl} className="w-full h-full" />
                )
              ) : (
                <div className="w-full h-full grid place-items-center text-sm text-gray-500">
                  Upload CV to preview (PDF, PNG, JPG)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
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

      {/* CV Preview Modal */}
      {cvPreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">CV Uploaded Successfully! 🎉</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review the extracted data below. Do you want to update your profile with this information?
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Personal Info */}
              {(cvPreviewData.extractedProfile.name !== "Unknown" || 
                cvPreviewData.extractedProfile.email !== "Unknown" || 
                cvPreviewData.extractedProfile.phone !== "Unknown") && (
                <div className="border rounded-xl p-4 bg-blue-50">
                  <div className="text-xs font-semibold text-gray-600 mb-3">Personal Information</div>
                  <div className="space-y-2 text-sm">
                    {cvPreviewData.extractedProfile.name !== "Unknown" && (
                      <div>
                        <span className="text-gray-500">Name:</span>{" "}
                        <span className="font-medium">{cvPreviewData.extractedProfile.name}</span>
                      </div>
                    )}
                    {cvPreviewData.extractedProfile.email !== "Unknown" && (
                      <div>
                        <span className="text-gray-500">Email:</span>{" "}
                        <span className="font-medium">{cvPreviewData.extractedProfile.email}</span>
                      </div>
                    )}
                    {cvPreviewData.extractedProfile.phone !== "Unknown" && (
                      <div>
                        <span className="text-gray-500">Phone:</span>{" "}
                        <span className="font-medium">{cvPreviewData.extractedProfile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desired Title (AI-extracted) */}
              {cvPreviewData.extractedProfile.desired_title && cvPreviewData.extractedProfile.desired_title !== "Unknown" && (
                <div className="border rounded-xl p-4 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Desired Title (AI-suggested)</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{profile.desiredTitle || "—"}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-medium text-green-700">{cvPreviewData.extractedProfile.desired_title}</span>
                  </div>
                </div>
              )}

              {/* Seniority */}
              {cvPreviewData.extractedProfile.seniority_hint !== "unknown" && (
                <div className="border rounded-xl p-4 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Seniority</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {({ intern: "Intern / Fresher", junior: "Junior", mid: "Mid", senior: "Senior", lead: "Lead / Manager" } as Record<string, string>)[profile.seniority || ""] || "—"}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-medium text-green-700">
                      {({ intern: "Intern / Fresher", junior: "Junior", mid: "Mid", senior: "Senior", lead: "Lead / Manager" } as Record<string, string>)[cvPreviewData.extractedProfile.seniority_hint] || cvPreviewData.extractedProfile.seniority_hint}
                    </span>
                  </div>
                </div>
              )}

              {/* Industries (AI-mapped) */}
              {cvPreviewData.extractedProfile.industry_ids?.length > 0 && (
                <div className="border rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-600">Industries</span>
                    <span className="text-xs text-gray-500">- AI mapped from your CV</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(cvPreviewData.extractedProfile.industry_names || []).map((name: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 text-xs rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                        {name}
                      </span>
                    ))}
                  </div>
                  {cvPreviewData.extractedProfile.industry_background && cvPreviewData.extractedProfile.industry_background !== "Unknown" && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      💡 Based on: {cvPreviewData.extractedProfile.industry_background}
                    </div>
                  )}
                </div>
              )}

              {/* Skills - AI Mapping Display */}
              {cvPreviewData.extractedProfile.skills_list?.length > 0 && (
                <div className="border rounded-xl p-4 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600 mb-3">Skills Profile</div>
                  
                  {/* AI-Mapped Categories */}
                  {cvPreviewData.extractedProfile.skill_categories?.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-blue-700 font-medium">🤖 Job Categories ({cvPreviewData.extractedProfile.skill_categories.length})</span>
                        <span className="text-xs text-gray-500">- Used for job matching</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cvPreviewData.extractedProfile.skill_categories.map((cat: string) => {
                          const categoryName = skillMap.get(cat) || cat;
                          return (
                            <span key={cat} className="px-3 py-1.5 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                              {cat} - {categoryName}
                            </span>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-gray-500 italic">
                        💡 AI automatically mapped your skills to these categories for accurate job recommendations
                      </div>
                    </div>
                  )}

                  {/* Detailed Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-green-700 font-medium">📋 Technical Skills ({cvPreviewData.extractedProfile.skills_list.length})</span>
                      <span className="text-xs text-gray-500">- Displayed on your profile</span>
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      {cvPreviewData.extractedProfile.skills_list.slice(0, 20).join(", ")}
                      {cvPreviewData.extractedProfile.skills_list.length > 20 && (
                        <span className="text-gray-500"> ... +{cvPreviewData.extractedProfile.skills_list.length - 20} more</span>
                      )}
                    </div>
                    {cvPreviewData.extractedProfile.skill_mapping && Object.keys(cvPreviewData.extractedProfile.skill_mapping).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">View skill → category mapping</summary>
                        <div className="mt-2 p-2 bg-white rounded border text-xs max-h-32 overflow-auto">
                          {Object.entries(cvPreviewData.extractedProfile.skill_mapping).slice(0, 15).map(([skill, category]) => (
                            <div key={skill} className="flex gap-2 py-0.5">
                              <span className="text-gray-700">{skill}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-blue-700 font-medium">{category as string}</span>
                            </div>
                          ))}
                          {Object.keys(cvPreviewData.extractedProfile.skill_mapping).length > 15 && (
                            <div className="text-gray-500 italic">... +{Object.keys(cvPreviewData.extractedProfile.skill_mapping).length - 15} more mappings</div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Info if no changes */}
              {(!cvPreviewData.extractedProfile.desired_title || cvPreviewData.extractedProfile.desired_title === "Unknown") && 
               cvPreviewData.extractedProfile.seniority_hint === "unknown" && 
               cvPreviewData.mergedSkills.length === 0 &&
               (!cvPreviewData.extractedProfile.industry_ids || cvPreviewData.extractedProfile.industry_ids.length === 0) && (
                <div className="text-center text-gray-500 py-4">
                  No profile data was extracted from this CV.
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={rejectCvChanges}
                className="flex-1 px-4 py-2.5 rounded-xl border bg-white hover:bg-gray-50 font-medium text-sm"
              >
                Keep Current Profile
              </button>
              <button
                type="button"
                onClick={applyCvChanges}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm"
              >
                Update Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV Processing Loading Overlay */}
      {isProcessingCv && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              {/* Spinner */}
              <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              
              {/* Title */}
              <h3 className="text-xl font-bold mb-2">Processing Your CV</h3>
              <p className="text-sm text-gray-600 mb-4">Please wait while we analyze your CV...</p>
              
              {/* Progress Steps */}
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-700">Uploading file...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-700">Extracting text (OCR)...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-700">Analyzing skills with AI...</span>
                </div>
              </div>
              
              <div className="mt-6 text-xs text-gray-500">
                This usually takes 5-10 seconds
              </div>
            </div>
          </div>
        </div>
      )}
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
}: any) {
  const [tab, setTab] = useState<"basics" | "prefs">("basics");

  return (
    <div className="border rounded-2xl p-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <TabBtn active={tab === "basics"} onClick={() => setTab("basics")}>
          Basics
        </TabBtn>
        <TabBtn active={tab === "prefs"} onClick={() => setTab("prefs")}>
          Preferences
        </TabBtn>
      </div>

      {tab === "basics" && (
        <div className="space-y-4">
          <div className="font-semibold">Basic info</div>

          <Field label="Full name">
            <input
              value={profile.fullName || ""}
              onChange={(e) => setField("fullName", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border"
              placeholder="VD: Phung Tat Dat"
            />
          </Field>

          <Field label="Desired title">
            <input
              value={profile.desiredTitle || ""}
              onChange={(e) => setField("desiredTitle", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border"
              placeholder="VD: Backend Engineer"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Seniority">
              <select
                value={profile.seniority || ""}
                onChange={(e) => setField("seniority", (e.target.value || undefined) as SeniorityLevel | undefined)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              >
                <option value="">—</option>
                {[
                  { value: "intern", label: "Intern / Fresher" },
                  { value: "junior", label: "Junior (1-2y)" },
                  { value: "mid", label: "Mid (2-5y)" },
                  { value: "senior", label: "Senior (5y+)" },
                  { value: "lead", label: "Lead / Manager" },
                ].map(
                  (x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Unit">
              <select
                value={profile.targetSalaryUnit || "monthly"}
                onChange={(e) => setField("targetSalaryUnit", e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              >
                <option value="monthly">monthly</option>
                <option value="hourly">hourly</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min salary">
              <input
                type="number"
                value={profile.targetSalaryMin ?? ""}
                onChange={(e) => setField("targetSalaryMin", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-xl border"
                placeholder="VD: 2"
                min={0}
              />
            </Field>
            <Field label="Max salary">
              <input
                type="number"
                value={profile.targetSalaryMax ?? ""}
                onChange={(e) => setField("targetSalaryMax", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-xl border"
                placeholder="VD: 10"
                min={0}
              />
            </Field>
          </div>

          <TagPicker<string>
            title="Skills"
            options={skills.map((s: any) => ({ value: s.skill_abr, label: `${s.skill_abr} — ${s.skill_name}` }))}
            selected={profile.skillAbbrs || []}
            onChange={(v) => setField("skillAbbrs", v)}
            placeholder="Search skill..."
          />
        </div>
      )}

      <>
        {tab === "prefs" && (
          <div className="space-y-4">
            <div className="font-semibold">Preferences</div>

            <TagPicker<number>
              title="Industries"
              options={industries.map((i: any) => ({ value: i.industry_id, label: i.industry_name }))}
              selected={profile.industryIds || []}
              onChange={(v) => setField("industryIds", v)}
              placeholder="Search industry..."
            />

            <TagPicker<string>
              title="Benefits"
              options={benefitTypes.map((t: string) => ({ value: t, label: t }))}
              selected={profile.benefitTypes || []}
              onChange={(v) => setField("benefitTypes", v)}
              placeholder="Search benefit..."
            />

            <Field label="Preferred Company Size">
              <select
                value={profile.companySize || ""}
                onChange={(e) => setField("companySize", e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              >
                <option value="">—</option>
                <option value="1-10">1-10 employees (Startup)</option>
                <option value="11-50">11-50 employees (Small)</option>
                <option value="51-200">51-200 employees (Medium)</option>
                <option value="201-500">201-500 employees (Large)</option>
                <option value="501-1000">501-1000 employees (Enterprise)</option>
                <option value="1000+">1000+ employees (Corporate)</option>
              </select>
            </Field>

            <TagPicker<string>
              title="Company Culture/Specialities"
              options={[
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
              ]}
              selected={profile.companySpecialities || []}
              onChange={(v) => setField("companySpecialities", v)}
              placeholder="Search culture/speciality..."
            />
          </div>
        )}

        {/* ✅ Snapshot as separate section - always visible */}
        <div className="mt-4 pt-4 border-t">
          <div className="font-semibold mb-3">Profile Snapshot</div>
          <div className="rounded-xl border p-3 text-xs text-gray-700 space-y-1.5 bg-gray-50">
            <div>
              <span className="font-medium">Salary:</span> {profile.targetSalaryMin ?? "—"} - {profile.targetSalaryMax ?? "—"} / {profile.targetSalaryUnit || "monthly"}
            </div>
            <div>
              <span className="font-medium">Industries:</span> {(profile.industryIds || []).map((id: any) => industryMap.get(id) || id).join(", ") || "—"}
            </div>
            <div>
              <span className="font-medium">Skills:</span> {(profile.skillAbbrs || []).map((a: any) =>
                skillMap.get(a) ? `${a}(${skillMap.get(a)})` : a
              ).join(", ") || "—"}
            </div>
            <div>
              <span className="font-medium">Benefits:</span> {(profile.benefitTypes || []).join(", ") || "—"}
            </div>
            <div>
              <span className="font-medium">Company Size:</span> {profile.companySize || "—"}
            </div>
            <div>
              <span className="font-medium">Company Culture:</span> {(profile.companySpecialities || []).join(", ") || "—"}
            </div>
          </div>
        </div>
      </>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 text-sm rounded-xl border",
        active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function mergeSkills(currentAbbrs: string[], ocrSkills: string[], allSkills: { skill_abr: string; skill_name: string }[]) {
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

  // Show all unselected options when focused, filter when user types
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const unselected = options.filter((o) => !selectedSet.has(String(o.value)));
    
    if (!qq) return unselected.slice(0, 50);
    
    return unselected
      .filter(
        (o) =>
          o.label.toLowerCase().includes(qq) || String(o.value).toLowerCase().includes(qq)
      )
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
      <div className="text-xs text-gray-600 mb-1 font-semibold">{title}</div>
      <div className="border rounded-2xl p-3">
        {/* Clear button and selected tags on same row */}
        <div className="flex flex-wrap items-center gap-2 min-h-[34px]">
          {selected.length === 0 ? (
            <div className="text-xs text-gray-500">No selection</div>
          ) : (
            selected.slice(0, 20).map((v) => {
              const label = options.find((o) => String(o.value) === String(v))?.label ?? String(v);
              return (
                <span key={String(v)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-white text-xs">
                  {label}
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    className="w-5 h-5 rounded-full border bg-white hover:bg-gray-50 grid place-items-center text-[10px]"
                    aria-label="Remove"
                    title="Remove"
                  >
                    ✕
                  </button>
                </span>
              );
            })
          )}
          {selected.length > 20 && <span className="text-xs text-gray-500">+{selected.length - 20} more</span>}
          
          {/* Clear button at the end of the row */}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 ml-auto"
            disabled={selected.length === 0}
          >
            Clear
          </button>
        </div>

        <div className="mt-2 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full px-3 py-2 rounded-xl border text-sm"
            placeholder={placeholder || "Search..."}
          />

          {(isFocused && filtered.length > 0) && (
            <div className="mt-2 max-h-[200px] overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {filtered.map((o, idx) => (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => add(o.value)}
                  className={[
                    "w-full text-left px-4 py-2.5 text-sm transition-colors",
                    "hover:bg-blue-50 hover:text-blue-900",
                    "focus:outline-none focus:bg-blue-50",
                    idx !== filtered.length - 1 ? "border-b border-gray-100" : ""
                  ].join(" ")}
                >
                  <span className="block font-medium">{o.label}</span>
                </button>
              ))}
            </div>
          )}

          {isFocused && q.trim() && filtered.length === 0 && (
            <div className="mt-2 text-xs text-gray-500">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
