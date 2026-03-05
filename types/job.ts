export type RubricScores = {
  skill_fit: number;
  industry_fit: number;
  seniority_fit: number;
  salary_fit: number;
  benefit_fit: number;
  final_score: number;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;

  url?: string;
  published_at?: string;

  source?: string;
  updated_at?: string;

  industries?: string[];
  skills?: string[];
  benefits?: string[];

  salary?: string;
  salary_bucket?: string;

  employee_bucket?: string;

  company_industries?: string[];
  company_specialities?: string[];

  job_description?: string;

  tags?: string[];

  // Recommend-specific fields
  rubric?: RubricScores;
  final_score?: number;
  retrieval_score?: number;
};
