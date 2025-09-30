export async function POST(req: Request) {
  const backend = process.env.BACKEND_BASE_URL || "http://localhost:8000";
  const form = await req.formData();
  const r = await fetch(`${backend.replace(/\/$/, "")}api/v1/cv/ocr`, { method: "POST", body: form });
  const data = await r.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }, status: r.status });
}
