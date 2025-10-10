import type { Job } from "@/types/job";
import { apiGet } from "@/lib/api";

export async function fetchJobsFromRemotive(query: string): Promise<Job[]> {
  const data = await apiGet<any>(`/api/remotive?q=${encodeURIComponent(query || "software")}`);
  const jobs: Job[] = (data?.jobs || []).slice(0, 500).map((j: any) => ({
    id: String(j.id),
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    url: j.url,
    published_at: j.publication_date,
    salary: j.salary || undefined,
    tags: j.tags || []
  }));
  return jobs;
}

export async function fetchJobsFromBackend(params: { q: string; location?: string; type?: string; seniority?: string; minSalary?: number }): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.location) qs.set("location", params.location);
  if (params.type) qs.set("type", params.type);
  if (params.seniority) qs.set("seniority", params.seniority);
  if (params.minSalary) qs.set("minSalary", String(params.minSalary));

  const data = await apiGet<{ jobs: Job[] }>(`/api/jobs?${qs.toString()}`);
  return data.jobs;
}
