export function cn(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(url: string, body: any, headers: Record<string,string> = {"Content-Type":"application/json"}): Promise<T> {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(body), headers });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}
