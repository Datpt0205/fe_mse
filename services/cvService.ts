// client/src/services/cvService.ts
// Gọi API backend có prefix /api/v1
import type { CvAnalysis, OcrResult } from "@/types/cv";
import { apiPost } from "@/lib/api";


type AnalyzePayload = { text: string; skills?: string[] };

// client/src/services/cvService.ts
const API = (process.env.NEXT_PUBLIC_API || "").replace(/\/+$/, "");
console.log("API", API)
const CV_BASE = `${API}/api/v1`;

export async function uploadCvToBackend(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("provider_type", "openai");
  form.append("model_name", "gpt-4o-mini");

  try {
    const res = await fetch(`${CV_BASE}/ocr`, { method: "POST", body: form });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const msg = `OCR ${res.status} ${res.statusText} ${txt || ""}`;
      console.error("[uploadCvToBackend] error:", msg);
      throw new Error(msg);
    }
    return res.json(); // { text, skills }
  } catch (e: any) {
    console.error("[uploadCvToBackend] fetch failed:", e);
    throw e;
  }
}

export async function recommendJobOnBackend(raw_text: string) {
  const form = new FormData();
  form.append("raw_text", raw_text || "");

  const res = await fetch(`${CV_BASE}/recommend`, { method: "POST", body: form });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Recommend failed: ${res.status} ${res.statusText} ${t}`);
  }
  return res.json(); // { title, description, skills_used, raw }
}


export async function analyzeCvOnBackend(payload: AnalyzePayload & { recommend?: { title?: string; description?: string } }) {
  const form = new FormData();
  form.append("provider_type", "openai");
  form.append("model_name", "gpt-4o-mini");
  form.append("raw_text", payload.text || "");

  // thêm recommend để phân tích sát mục tiêu nghề hơn
  form.append("recommend_title", payload.recommend?.title || "");
  form.append("recommend_description", payload.recommend?.description || "");

  const res = await fetch(`${CV_BASE}/analyze-ui`, { method: "POST", body: form });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Analyze failed");
  }
  const json = await res.json();
  return json.data;
}

export async function mockAnalyzeCv(payload: { text: string; skills: string[] }): Promise<CvAnalysis> {
  await new Promise(r => setTimeout(r, 700));
  const base = payload.skills.slice(0, 8);

  // radar động mẫu (5 trục)
  const radar = [
    { axis: "Backend",  score: 40 },
    { axis: "Data",     score: 30 },
    { axis: "DevOps",   score: 50 },
    { axis: "Frontend", score: 20 },
    { axis: "AI/ML",    score: 10 },
  ];

  return {
    strengths: base.slice(0, 4).map((s, i) => ({ skill: s, score: 82 - i * 9, note: "Kinh nghiệm vững" })),
    weaknesses: [
      { skill: "AI/ML",    gap: 90, tip: "Tăng AI/ML qua dự án nhỏ & luyện 30–60 phút/ngày", url: "https://www.coursera.org/learn/machine-learning" },
      { skill: "Frontend", gap: 80, tip: "Tăng Frontend qua dự án nhỏ & luyện 30–60 phút/ngày", url: "https://nextjs.org/learn" },
      { skill: "Data",     gap: 70, tip: "Ôn SQL/ETL + thực hành Airflow", url: "https://www.udemy.com/course/the-ultimate-hands-on-course-to-master-apache-airflow/" },
    ],
    industries: [
      { name: "Fintech",     score: 86, rationale: "Phù hợp kỹ năng xử lý dữ liệu/ETL" },
      { name: "E-commerce",  score: 79, rationale: "Kinh nghiệm web + phân tích hành vi" },
      { name: "AI/ML",       score: 72, rationale: "Có nền tảng NLP/RecSys" }
    ],
    roles: [
      { name: "Data Engineer",         score: 84, rationale: "SQL + Python + ETL tốt" },
      { name: "ML Engineer (RecSys)",  score: 80, rationale: "Có trải nghiệm đề tài recommendation" }
    ],
    explanations: [
      "Tỷ lệ trùng kỹ năng cao với nhóm việc ML/Data",
      "Kinh nghiệm triển khai dịch vụ web phù hợp môi trường sản xuất"
    ],
    radar, // <-- thêm radar vào kết quả mock
  };
}