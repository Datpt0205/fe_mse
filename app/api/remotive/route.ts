export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || searchParams.get("search") || "software";
  const r = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}`, { cache: "no-store" });
  const data = await r.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }, status: r.status });
}
