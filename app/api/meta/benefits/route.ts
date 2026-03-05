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
  const file = path.join(getDataDir(), "jobs", "benefits.csv");
  if (!(await exists(file))) return Response.json({ benefitTypes: [] }, { status: 200 });

  const text = await fs.readFile(file, "utf-8");
  const rows = parseCsv(text);

  const set = new Set<string>();
  for (const r of rows) {
    const t = (r.type || "").trim();
    if (t) set.add(t);
  }
  return Response.json({ benefitTypes: Array.from(set).sort((a, b) => a.localeCompare(b)) });
}
