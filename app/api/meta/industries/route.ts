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
  const file = path.join(getDataDir(), "mappings", "industries.csv");
  if (!(await exists(file))) return Response.json({ industries: [] }, { status: 200 });

  const text = await fs.readFile(file, "utf-8");
  const rows = parseCsv(text);

  const industries = rows
    .map((r) => ({ industry_id: Number(r.industry_id), industry_name: (r.industry_name || "").trim() }))
    .filter((x) => Number.isFinite(x.industry_id) && x.industry_name);

  return Response.json({ industries });
}
