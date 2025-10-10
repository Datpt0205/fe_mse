"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

type RadarItem = { label: string; value: number };

export default function RadarPanel({ data }: { data: RadarItem[] }) {
  // Guard: nếu thiếu dữ liệu, không vẽ
  const safe = Array.isArray(data) ? data.filter(d => Number.isFinite(d.value)) : [];
  if (safe.length < 3) {
    return <div className="h-56 flex items-center justify-center text-xs text-gray-500">
      Không đủ dữ liệu để vẽ radar (cần ≥ 3 trục).
    </div>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={safe}>
          <PolarGrid />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Radar name="Score" dataKey="value" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
