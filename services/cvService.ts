import type { CvAnalysis, OcrResult } from "@/types/cv";
import { apiPost } from "@/lib/api";

export async function uploadCvToBackend(file: File): Promise<OcrResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/cv/ocr`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("OCR API error");
  return res.json();
}

export async function analyzeCvOnBackend(payload: { text: string; skills: string[] }): Promise<CvAnalysis> {
  return apiPost<CvAnalysis>(`/api/cv/analyze`, payload);
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
