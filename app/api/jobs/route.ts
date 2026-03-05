export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { Job } from "@/types/job";
import { pool } from "@/lib/pg";
import { splitToArray } from "@/lib/splitToArray";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const location = (searchParams.get("location") || "").trim();

  // Các param này có thể bạn chưa dùng ở DB: để sẵn, chưa filter
  const type = (searchParams.get("type") || "").trim();
  const seniority = (searchParams.get("seniority") || "").trim();
  const minSalary = Number(searchParams.get("minSalary") || 0);

  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  const where: string[] = [];
  const values: any[] = [];

  if (q) {
    values.push(`%${q}%`);
    const p = values.length;
    where.push(`(title ILIKE $${p} OR company_name ILIKE $${p} OR job_description ILIKE $${p})`);
  }

  if (location) {
    values.push(`%${location}%`);
    const p = values.length;
    where.push(`location ILIKE $${p}`);
  }

  // type/seniority/minSalary: DB hiện chưa có field chuẩn để filter.
  // Nếu sau này bạn thêm cột, bạn chỉ cần bổ sung WHERE ở đây.
  void type;
  void seniority;
  void minSalary;

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT
      job_id, title, company_name, location,
      industries, skills, salary_bucket, benefits,
      employee_bucket, company_industries, company_specialities, source, updated_at
    FROM jobs
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  values.push(limit, offset);

  const { rows } = await pool.query(sql, values);

  const jobs: Job[] = rows.map((r: any) => {
    const industriesArr = splitToArray(r.industries);
    const skillsArr = splitToArray(r.skills);

    return {
      id: String(r.job_id),
      title: r.title || "",
      company: r.company_name || "",
      location: r.location || "Remote",

      source: r.source || undefined,
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,

      salary_bucket: r.salary_bucket || undefined,
      salary: r.salary_bucket || undefined, // giữ tương thích UI cũ

      employee_bucket: r.employee_bucket || undefined,

      industries: industriesArr,
      skills: skillsArr,
      benefits: splitToArray(r.benefits),

      company_industries: splitToArray(r.company_industries),
      company_specialities: splitToArray(r.company_specialities),

      job_description: r.job_description || undefined,

      // tags để UI list render chip nhanh
      tags: Array.from(new Set([...skillsArr, ...industriesArr])).slice(0, 12),
    };
  });

  return NextResponse.json({ jobs });
}
