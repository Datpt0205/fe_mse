export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const backend = process.env.BACKEND_BASE_URL || "http://localhost:8000";
  const target = `${backend.replace(/\/$/, "")}/jobs?${searchParams.toString()}`;
  const r = await fetch(target, { cache: "no-store" });
  const data = await r.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }, status: r.status });
}
