export function splitToArray(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  const s = String(v).trim();
  if (!s) return [];

  // Nếu lỡ lưu JSON string dạng array/object
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map(x => String(x).trim()).filter(Boolean);
      }
    } catch {
      // ignore
    }
  }

  // Mặc định: tách theo dấu phẩy
  return s
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}
