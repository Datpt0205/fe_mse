// client/src/services/cvService.ts
// Gọi API backend có prefix /api/v1
import type { CvAnalysis, OcrResult } from "@/types/cv";
import { apiPost } from "@/lib/api";


type AnalyzePayload = { text: string; skills?: string[] };

// client/src/services/cvService.ts
const API = (process.env.NEXT_PUBLIC_API || "").replace(/\/+$/, "");
console.log("API", API)
const CV_BASE = `${API}/api/v1/cv`;

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


/** Phân tích CV (raw text) -> UI payload cho màn hình Analysis */
export async function analyzeCvOnBackend(payload: AnalyzePayload) {
  const form = new FormData();
  form.append("provider_type", "openai");
  form.append("model_name", "gpt-4o-mini");
  form.append("raw_text", payload.text || "");

  const res = await fetch(`${CV_BASE}/analyze-ui-heuristic`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let msg = "Analyze failed";
    try {
      const t = await res.text();
      if (t) msg = t;
    } catch {}
    throw new Error(msg);
  }
  // { status, message, data } -> trả luôn data cho component
  const json = await res.json();
  return json.data;
}



export async function mockAnalyzeCv(payload: { text: string; skills: string[] }): Promise<CvAnalysis> {
  await new Promise(r=>setTimeout(r,700));
  const base = payload.skills.slice(0, 8);
  return {
    strengths: base.slice(0, 4).map((s, i) => ({ skill: s, score: 82 - i * 9, note: "Kinh nghiệm vững" })),
    weaknesses: [
      { skill: "System Design", gap: 35, tip: "Ôn pattern, luyện mock interview" },
      { skill: "Cloud (AWS)", gap: 25, tip: "Học dịch vụ core: EC2, S3, RDS" }
    ],
    industries: [
      { name: "Fintech", score: 86, rationale: "Phù hợp kỹ năng xử lý dữ liệu/ETL" },
      { name: "E-commerce", score: 79, rationale: "Kinh nghiệm web + phân tích hành vi" },
      { name: "AI/ML", score: 72, rationale: "Có NLP/RecSys nền tảng" }
    ],
    roles: [
      { name: "Data Engineer", score: 84, rationale: "SQL + Python + ETL tốt" },
      { name: "ML Engineer (RecSys)", score: 80, rationale: "Có trải nghiệm đề tài recommendation" }
    ],
    overall_score: 82,
    explanations: [
      "Tỷ lệ trùng kỹ năng cao với nhóm việc ML/Data",
      "Kinh nghiệm triển khai dịch vụ web phù hợp môi trường sản xuất"
    ]
  };
}
