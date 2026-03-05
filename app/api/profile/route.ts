export const dynamic = "force-dynamic";

import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const PROFILE_FILE = path.join(STORAGE_DIR, "profile_demo_user.json");

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function GET() {
  try {
    await ensureDir();
    const raw = await fs.readFile(PROFILE_FILE, "utf-8");
    return Response.json({ profile: JSON.parse(raw) });
  } catch {
    return Response.json({ profile: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  await ensureDir();
  const body = await req.json();
  await fs.writeFile(PROFILE_FILE, JSON.stringify(body.profile ?? null, null, 2), "utf-8");
  return Response.json({ ok: true });
}
