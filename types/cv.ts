export type OcrResult = {
  text: string;
  skills: string[];
  meta?: Record<string, unknown>;
};

export type CvAnalysis = {
  strengths: { skill: string; score: number; note?: string }[];
  weaknesses: { skill: string; gap: number; tip?: string }[];
  industries: { name: string; score: number; rationale?: string }[];
  roles?: { name: string; score: number; rationale?: string }[];
  overall_score?: number;
  explanations?: string[];
};
