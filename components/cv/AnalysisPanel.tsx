"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Star } from "lucide-react";
import type { CvAnalysis, OcrResult } from "@/types/cv";
import { mockAnalyzeCv, extractProfileFromBackend } from "@/services/cvService";
import RadarPanel from "@/components/cv/RadarPanel";
import ExpandableText from "@/components/common/ExpandableText";
import { useReactToPrint } from "react-to-print";

function AnalysisCard({
  title, children, actions, className = ""
}: { title: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={`border rounded-2xl p-4 h-full ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>
      <div className="min-h-0 break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

type RecommendResult = { title: string; description: string; skills_used: string[]; raw?: string };

export default function AnalysisPanel({ ocr, useBackend = false }: { ocr: OcrResult | null; useBackend?: boolean }) {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ====== PRINT SETUP ======
  const panelRef = useRef<HTMLDivElement>(null);
  const handleExport = useReactToPrint({
    contentRef: panelRef,
    documentTitle: "cv-analysis",
  });

  const radarData =
    analysis?.radar?.length
      ? analysis.radar.map(r => ({ label: r.axis, value: Math.max(0, Math.min(100, Number(r.score) || 0)) }))
      : (analysis?.strengths || []).map(s => ({ label: s.skill, value: Math.max(0, Math.min(100, Number(s.score) || 0)) }));

  async function run() {
    if (!ocr) return;
    setError(null);
    setAnalysis(null);

    const rawText = ocr.text ?? "";
    const skillsFromOcr = ocr.skills ?? [];

    try {
      if (!useBackend) {
        setLoading(true);
        const res = await mockAnalyzeCv({ text: rawText, skills: skillsFromOcr });
        setAnalysis(res);
        return;
      }

      // ===== Backend mode: Use extract-profile with detailed=true  =====
      setLoading(true);
      const res = await extractProfileFromBackend(rawText, true);
      setAnalysis(res);
    } catch (e: any) {
      setError(e?.message || "Lỗi phân tích CV");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ocr) run();
    // eslint-disable-next-line
  }, [ocr?.text, (ocr?.skills || []).join(","), useBackend]);

  if (!ocr) return <div className="text-gray-500 text-sm">Download CV to see detailed analysis here.</div>;

  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-1 print:hidden"
        title="Export only this analysis section"
      >
        <Download className="w-3 h-3" /> Export
      </button>
    </div>
  );

  return (
    <div ref={panelRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Existing cards */}
      <AnalysisCard title="Strengths" actions={actions}>
        {loading && <div className="text-gray-600 text-sm">Analyzing...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!loading && analysis && (
          <ul className="space-y-2">
            {analysis.strengths.map((s) => (
              <li key={s.skill} className="flex items-center justify-between">
                <span className="text-gray-800 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  {s.skill}
                </span>
                <span className="text-gray-600 text-sm">{s.score}/100</span>
              </li>
            ))}
          </ul>
        )}
      </AnalysisCard>

      <AnalysisCard title="Needs improvement">
        {!loading && analysis && (
          <ul className="space-y-3">
            {analysis.weaknesses.map((w) => (
              <li key={w.skill} className="text-sm">
                <div className="font-medium">
                  {w.skill} <span className="text-gray-600 font-normal">• Gap {w.gap}</span>
                </div>
                {w.tip && <div className="text-xs text-gray-600 mt-0.5">{w.tip}</div>}
              </li>
            ))}
          </ul>
        )}
        {loading && <div className="text-gray-600 text-sm">Analyzing...</div>}
      </AnalysisCard>

      <AnalysisCard title="Skill radar">
        {!loading && analysis && <RadarPanel data={radarData} />}
        {loading && <div className="text-gray-600 text-sm">Analyzing...</div>}
      </AnalysisCard>

      <AnalysisCard title="Recommended industry">
        {!loading && analysis && (
          <div className="space-y-2">
            {analysis.industries.map((i) => (
              <div key={i.name} className="p-3 rounded-xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-emerald-900 mb-1">{i.name}</div>
                    {i.rationale && <ExpandableText text={String(i.rationale)} lines={2} />}
                  </div>
                  <div className="px-3 py-1 bg-emerald-600 text-white text-sm font-bold rounded-full shrink-0">
                    {i.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      {/* Nếu muốn “Suggested title” hiển thị theo OpenAI roles thì giữ,
          nhưng để tránh trùng nghĩa, đổi title thành “Other suitable roles (AI)” */}
      <AnalysisCard title="Other suitable roles (AI)">
        {!loading && analysis?.roles && (
          <div className="space-y-2">
            {analysis.roles.map((r) => (
              <div key={r.name} className="p-3 rounded-xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white hover:border-indigo-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-indigo-900 mb-1">{r.name}</div>
                    {r.rationale && <ExpandableText text={String(r.rationale)} lines={2} />}
                  </div>
                  <div className="px-3 py-1 bg-indigo-600 text-white text-sm font-bold rounded-full shrink-0">
                    {r.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      {analysis?.explanations && analysis.explanations.length > 0 && (
        <AnalysisCard title="Why this suggestion?">
          <ul className="list-disc list-inside space-y-1">
            {analysis.explanations.map((e, i) => (
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
