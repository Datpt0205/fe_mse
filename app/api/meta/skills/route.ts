export const dynamic = "force-dynamic";

import fs from "fs/promises";
import path from "path";
import { parseCsv } from "@/lib/csv";

function getDataDir() {
  const env = process.env.DATA_DIR?.trim();
  if (env) return env;
  // Docker: /app/data is mounted, Local dev: ../data
  return path.resolve(process.cwd(), "data");
}

async function exists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function GET() {
  const file = path.join(getDataDir(), "mappings", "skills.csv");
  if (!(await exists(file))) return Response.json({ skills: [] }, { status: 200 });

  const text = await fs.readFile(file, "utf-8");
  const rows = parseCsv(text);

  const skills = rows
    .map((r) => ({ skill_abr: (r.skill_abr || "").trim(), skill_name: (r.skill_name || "").trim() }))
    .filter((x) => x.skill_abr && x.skill_name);

  return Response.json({ skills });
}
