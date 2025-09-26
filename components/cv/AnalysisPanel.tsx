"use client";
import { useEffect, useState } from "react";
import { Download, Star } from "lucide-react";
import type { CvAnalysis, OcrResult } from "@/types/cv";
import { analyzeCvOnBackend, mockAnalyzeCv } from "@/services/cvService";
import RadarPanel from "@/components/cv/RadarPanel";

function AnalysisCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

export default function AnalysisPanel({ ocr, useBackend = false }: { ocr: OcrResult | null; useBackend?: boolean }) {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!ocr) return;
    setLoading(true); setError(null);
    try {
      const payload = { text: ocr.text, skills: ocr.skills };
      const res = useBackend ? await analyzeCvOnBackend(payload) : await mockAnalyzeCv(payload);
      setAnalysis(res);
    } catch (e: any) {
      setError(e?.message || "Lỗi phân tích CV");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (ocr) run(); /* eslint-disable-next-line */ }, [ocr, useBackend]);

  if (!ocr) return <div className="border rounded-2xl p-4 text-gray-500 text-sm">Tải CV để xem phân tích chi tiết tại đây.</div>;

  const actions = (
    <div className="flex items-center gap-2">
      <button onClick={()=> window.print()} className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-1">
        <Download className="w-3 h-3"/> Export
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <AnalysisCard title="Điểm mạnh" actions={actions}>
        {loading && <div className="text-gray-600 text-sm">Đang phân tích...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!loading && analysis && (
          <ul className="space-y-2">
            {analysis.strengths.map((s) => (
              <li key={s.skill} className="flex items-center justify-between">
                <span className="text-gray-800 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500"/>{s.skill}</span>
                <span className="text-gray-600 text-sm">{s.score}/100</span>
              </li>
            ))}
          </ul>
        )}
      </AnalysisCard>

      <AnalysisCard title="Cần cải thiện">
        {!loading && analysis && (
          <ul className="space-y-2">
            {analysis.weaknesses.map((w) => (
              <li key={w.skill} className="text-sm">
                <span className="font-medium">{w.skill}</span>
                <span className="text-gray-600"> • khoảng cách {w.gap}</span>
                {w.tip && <span className="block text-gray-500">Gợi ý: {w.tip}</span>}
              </li>
            ))}
          </ul>
        )}
        {loading && <div className="text-gray-600 text-sm">Đang phân tích...</div>}
      </AnalysisCard>

      <AnalysisCard title="Radar kỹ năng">
        {!loading && analysis && (
          <RadarPanel data={analysis.strengths.map(s => ({ skill: s.skill, score: s.score }))} />
        )}
        {loading && <div className="text-gray-600 text-sm">Đang phân tích...</div>}
      </AnalysisCard>

      <AnalysisCard title="Ngành đề xuất">
        {!loading && analysis && (
          <div className="space-y-2">
            {analysis.industries.map((i) => (
              <div key={i.name} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{i.name}</div>
                  {i.rationale && <div className="text-xs text-gray-600">{i.rationale}</div>}
                </div>
                <div className="text-sm font-semibold text-emerald-700">{i.score}</div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      <AnalysisCard title="Chức danh gợi ý">
        {!loading && analysis?.roles && (
          <div className="space-y-2">
            {analysis.roles.map((r) => (
              <div key={r.name} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  {r.rationale && <div className="text-xs text-gray-600">{r.rationale}</div>}
                </div>
                <div className="text-sm font-semibold text-indigo-700">{r.score}</div>
              </div>
            ))}
          </div>
        )}
        {loading && <div className="text-gray-600 text-sm">Đang phân tích...</div>}
      </AnalysisCard>

      {analysis?.explanations && analysis.explanations.length>0 && (
        <AnalysisCard title="Vì sao có gợi ý này?">
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {analysis.explanations.map((e,i)=> <li key={i}>{e}</li>)}
          </ul>
        </AnalysisCard>
      )}
    </div>
  );
}
