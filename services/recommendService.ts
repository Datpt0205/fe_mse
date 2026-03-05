import type { UserProfile } from "@/types/profile";

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || "http://localhost:8686";

export function buildRecommendPayload(
  profile: UserProfile,
  industryMap: Map<number, string>,
  forceRefresh = false
) {
  const skillsText =
    Array.isArray(profile.skillAbbrs) && profile.skillAbbrs.length
      ? profile.skillAbbrs.join(", ")
      : "Unknown";

  const industryText =
    Array.isArray(profile.industryIds) && profile.industryIds.length
      ? profile.industryIds
          .map((id) => industryMap.get(Number(id)) || String(id))
          .filter(Boolean)
          .join(", ")
      : "Unknown";

  const targetSalary =
    profile.targetSalaryMin || profile.targetSalaryMax
      ? `${profile.targetSalaryMin ?? ""}-${profile.targetSalaryMax ?? ""} ${profile.targetSalaryUnit || ""}`.trim()
      : "Unknown";

  return {
    profile: {
      skills: skillsText,
      industry: industryText,
      seniority: (profile as any)?.seniority || "Unknown",
      target_salary: targetSalary,
      prefs: {
        benefits: Array.isArray(profile.benefitTypes)
          ? profile.benefitTypes.join(", ")
          : "Unknown",
        employee_bucket: (profile as any)?.companySize || "Unknown",
        company_industries: industryText,
        company_specialities: Array.isArray(
          (profile as any)?.companySpecialities
        )
          ? (profile as any).companySpecialities.join(", ")
          : "Unknown",
      },
    },
    topk: 50,
    fields_mode: "full",
    force_refresh: forceRefresh,
  };
}

export async function requestRecommend(
  payload: any,
  signal?: AbortSignal
) {
  const url = `${BE_URL}/api/v1/jobfit/recommend`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Fast read-only: GET /jobfit/cache — no ML computation, just reads cached file */
export async function fetchCachedRecommendations(signal?: AbortSignal) {
  const url = `${BE_URL}/api/v1/jobfit/cache`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  const recs = data?.recommendations;
  if (!Array.isArray(recs) || recs.length === 0) return null;

  // Map backend format → Job type, dedup by job_id
  const mapped = recs.map(mapRecommendToJob);
  const seen = new Set<string>();
  return mapped.filter((j: any) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });
}

/** Convert backend recommend item → frontend Job type */
function mapRecommendToJob(rec: any) {
  const toArr = (v: any): string[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v && v !== "Unknown") return v.split(",").map((s: string) => s.trim()).filter(Boolean);
    return [];
  };

  return {
    id: String(rec.job_id ?? rec.id ?? ""),
    title: rec.title || "Unknown",
    company: rec.company_name || rec.company || "Unknown",
    location: rec.location || "",
    url: rec.url || "",
    source: "recommend",
    skills: toArr(rec.skills),
    industries: toArr(rec.industries),
    benefits: toArr(rec.benefits),
    salary: rec.salary || rec.salary_bucket || "",
    salary_bucket: rec.salary_bucket || "",
    employee_bucket: rec.employee_bucket || "",
    company_industries: toArr(rec.company_industries),
    company_specialities: toArr(rec.company_specialities),
    job_description: rec.job_description || "",
    // Preserve recommend-specific fields
    final_score: rec.final_score,
    rubric: rec.rubric,
    retrieval_score: rec.retrieval_score,
  };
}
