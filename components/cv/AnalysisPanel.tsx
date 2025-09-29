"use client";
import { useEffect, useState } from "react";
import { Download, Star } from "lucide-react";
import type { CvAnalysis, OcrResult } from "@/types/cv";
import { analyzeCvOnBackend, mockAnalyzeCv } from "@/services/cvService";
import RadarPanel from "@/components/cv/RadarPanel";
import ExpandableText from "@/components/common/ExpandableText";

function AnalysisCard({
  title, children, actions, className = ""
}: { title: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={`border rounded-2xl p-4 h-full ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>
      {/* tránh bẻ từ xấu + tự giãn */}
      <div className="min-h-0 break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export default function AnalysisPanel({ ocr, useBackend = false }: { ocr: OcrResult | null; useBackend?: boolean }) {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!ocr) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const payload = { text: ocr.text ?? "", skills: ocr.skills ?? [] };
      const res = useBackend ? await analyzeCvOnBackend(payload) : await mockAnalyzeCv(payload);
      setAnalysis(res);
    } catch (e:any) {
      setError(e?.message || "Lỗi phân tích CV");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (ocr) run(); /* eslint-disable-next-line */ }, [ocr?.text, (ocr?.skills||[]).join(","), useBackend]);
  if (!ocr) return <div className="text-gray-500 text-sm">Tải CV để xem phân tích chi tiết tại đây.</div>;

  const actions = (
    <div className="flex items-center gap-2">
      <button onClick={()=> window.print()} className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-1">
        <Download className="w-3 h-3"/> Export
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Row 1 */}
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
          <ul className="space-y-3">
            {analysis.weaknesses.map((w) => (
              <li key={w.skill} className="text-sm">
                <div className="font-medium">{w.skill} <span className="text-gray-600 font-normal">• khoảng cách {w.gap}</span></div>
                {w.tip && <ExpandableText text={`Gợi ý: ${w.tip}`} lines={2} className="mt-0.5" />}
              </li>
            ))}
          </ul>
        )}
        {loading && <div className="text-gray-600 text-sm">Đang phân tích...</div>}
      </AnalysisCard>

      {/* Row 2 */}
      <AnalysisCard title="Radar kỹ năng">
        {!loading && analysis && <RadarPanel data={analysis.strengths.map(s => ({ skill: s.skill, score: s.score }))} />}
        {loading && <div className="text-gray-600 text-sm">Đang phân tích...</div>}
      </AnalysisCard>

      <AnalysisCard title="Ngành đề xuất">
        {!loading && analysis && (
          <div className="space-y-3">
            {analysis.industries.map((i) => (
              <div key={i.name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{i.name}</div>
                  {i.rationale && <ExpandableText text={String(i.rationale)} lines={3} />}
                </div>
                <div className="text-sm font-semibold text-emerald-700 shrink-0">{i.score}</div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      {/* Row 3 */}
      <AnalysisCard title="Chức danh gợi ý">
        {!loading && analysis?.roles && (
          <div className="space-y-3">
            {analysis.roles.map((r) => (
              <div key={r.name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{r.name}</div>
                  {r.rationale && <ExpandableText text={String(r.rationale)} lines={3} />}
                </div>
                <div className="text-sm font-semibold text-indigo-700 shrink-0">{r.score}</div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      {analysis?.explanations && analysis.explanations.length>0 && (
        <AnalysisCard title="Vì sao có gợi ý này?">
          <ul className="list-disc list-inside space-y-1">
            {analysis.explanations.map((e,i)=> (
              <li key={i} className="text-sm">
                <ExpandableText text={String(e)} lines={3} />
              </li>
            ))}
          </ul>
        </AnalysisCard>
      )}
    </div>
  );
}
