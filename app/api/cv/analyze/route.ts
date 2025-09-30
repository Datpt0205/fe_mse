export async function POST(req: Request) {
  const backend = process.env.BACKEND_BASE_URL || "http://localhost:8000";
  const payload = await req.json();
  const r = await fetch(`${backend.replace(/\/$/, "")}api/v1/cv/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }, status: r.status });
}
