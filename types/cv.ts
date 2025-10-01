export type RadarPoint = { axis: string; score: number };

export type UiStrength = { skill: string; score: number };
export type UiWeakness = { skill: string; gap: number; tip?: string; url?: string };
export type UiIndustry = { name: string; score: number; rationale?: string };
export type UiRole = { name: string; score: number; rationale?: string };

export type CvAnalysis = {
  strengths: UiStrength[];
  weaknesses: UiWeakness[];
  industries: UiIndustry[];
  roles: UiRole[];
  explanations?: string[];
  overall_score?: number;
  radar: RadarPoint[]; // NEW: radar động
};

export type OcrResult = { text: string; skills: string[] };
