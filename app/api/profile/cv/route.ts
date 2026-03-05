export const dynamic = "force-dynamic";

import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const META_FILE = path.join(STORAGE_DIR, "cv_demo_user_meta.json");

// Supported MIME → extension mapping
const MIME_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

type CvMeta = { fileName: string; ext: string; contentType: string };

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

async function readMeta(): Promise<CvMeta | null> {
  try {
    const raw = await fs.readFile(META_FILE, "utf-8");
    return JSON.parse(raw) as CvMeta;
  } catch {
    // Fallback: check for legacy cv_demo_user.pdf
    try {
      await fs.access(path.join(STORAGE_DIR, "cv_demo_user.pdf"));
      return { fileName: "cv_demo_user.pdf", ext: ".pdf", contentType: "application/pdf" };
    } catch {
      return null;
    }
  }
}

function cvFilePath(ext: string) {
  return path.join(STORAGE_DIR, `cv_demo_user${ext}`);
}

export async function GET() {
  try {
    const meta = await readMeta();
    if (!meta) return new Response("Not found", { status: 404 });

    const buf = await fs.readFile(cvFilePath(meta.ext));

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": meta.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// Return metadata (content type) so frontend knows how to render
export async function HEAD() {
  try {
    const meta = await readMeta();
    if (!meta) return new Response(null, { status: 404 });

    return new Response(null, {
      headers: {
        "Content-Type": meta.contentType,
        "X-Cv-Content-Type": meta.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export async function POST(req: Request) {
  await ensureDir();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ ok: false, error: "Missing file" }, { status: 400 });

  const ext = MIME_EXT[file.type];
  if (!ext) {
    return Response.json(
      { ok: false, error: `Unsupported file type: ${file.type}. Accepted: PDF, PNG, JPG` },
      { status: 400 }
    );
  }

  // Delete old CV file (may have different extension)
  const oldMeta = await readMeta();
  if (oldMeta) {
    await fs.unlink(cvFilePath(oldMeta.ext)).catch(() => {});
  }
  // Also clean up legacy file
  await fs.unlink(path.join(STORAGE_DIR, "cv_demo_user.pdf")).catch(() => {});

  // Write new file + metadata
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(cvFilePath(ext), Buffer.from(arrayBuffer));
  await fs.writeFile(META_FILE, JSON.stringify({ fileName: file.name, ext, contentType: file.type }));

  return Response.json({ ok: true, url: "/api/profile/cv", contentType: file.type });
}

export async function DELETE() {
  try {
    const meta = await readMeta();
    if (meta) {
      await fs.unlink(cvFilePath(meta.ext)).catch(() => {});
    }
    await fs.unlink(META_FILE).catch(() => {});
    // Clean up legacy
    await fs.unlink(path.join(STORAGE_DIR, "cv_demo_user.pdf")).catch(() => {});
  } catch {}
  return Response.json({ ok: true });
}
