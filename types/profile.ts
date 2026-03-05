import type { OcrResult } from "@/types/cv";

export type SeniorityLevel =
  | "intern" | "junior" | "mid" | "senior" | "lead";

export type SalaryUnit = "monthly" | "hourly";

export type UserProfile = {
  id: "demo_user";
  fullName?: string;
  desiredTitle?: string;
  seniority?: SeniorityLevel;
targetSalaryMin?: number;
  targetSalaryMax?: number;
  targetSalaryUnit?: SalaryUnit;

  industryIds: number[];
  benefitTypes: string[];
  skillAbbrs: string[];
  
  // Company preferences for job matching
  companySize?: string;        // e.g., "1-10", "50-200", "1000+"
  companySpecialities?: string[]; // e.g., ["Fast-paced", "Remote-first", "Startup"]

  cv?: {
    fileName?: string;
    ocr?: OcrResult;      // persist OCR result, NOT PDF bytes
    updatedAt?: string;
  };
};
