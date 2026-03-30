"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Sparkles, Star, Target } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import RadarPanel from "@/components/cv/RadarPanel";
import ExpandableText from "@/components/common/ExpandableText";
import type { CvAnalysis, OcrResult } from "@/types/cv";
import { extractProfileFromBackend, mockAnalyzeCv } from "@/services/cvService";

function AnalysisCard({
  title,
  eyebrow,
  children,
  actions,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[1.35rem] border  bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))] p-4 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.45)]",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(220,10%,56%)]">
              {eyebrow}
            </div>
          )}
          <h3 className="mt-1 text-base font-semibold text-[hsl(220,20%,14%)]">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="min-h-0 break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export default function AnalysisPanel({
  ocr,
  useBackend = false,
}: {
  ocr: OcrResult | null;
  useBackend?: boolean;
}) {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const handleExport = useReactToPrint({
    contentRef: panelRef,
    documentTitle: "cv-analysis",
  });

  const radarData =
    analysis?.radar?.length
      ? analysis.radar.map((r) => ({
          label: r.axis,
          value: Math.max(0, Math.min(100, Number(r.score) || 0)),
        }))
      : (analysis?.strengths || []).map((s) => ({
          label: s.skill,
          value: Math.max(0, Math.min(100, Number(s.score) || 0)),
        }));

  async function run() {
    if (!ocr) return;
    setError(null);
    setAnalysis(null);

    const rawText = ocr.text ?? "";
    const skillsFromOcr = ocr.skills ?? [];

    try {
      setLoading(true);
      if (!useBackend) {
        const res = await mockAnalyzeCv({ text: rawText, skills: skillsFromOcr });
        setAnalysis(res);
        return;
      }

      const res = await extractProfileFromBackend(rawText, true);
      setAnalysis(res);
    } catch (e: any) {
      setError(e?.message || "CV analysis failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ocr) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocr?.text, (ocr?.skills || []).join(","), useBackend]);

  if (!ocr) {
    return (
      <div className="rounded-[1.35rem] border border-dashed  bg-white/55 px-4 py-6 text-sm text-[hsl(220,10%,42%)]">
        Upload a CV to generate strengths, gaps, industry suggestions, and skill radar.
      </div>
    );
  }

  const actions = (
    <button
      onClick={handleExport}
      className="btn-ghost inline-flex items-center gap-1 px-3 py-2 text-xs print:hidden"
      title="Export only this analysis section"
    >
      <Download className="h-3 w-3" />
      Export
    </button>
  );

  return (
    <div ref={panelRef} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AnalysisCard title="Strengths" eyebrow="Top signal" actions={actions}>
        {loading && <div className="text-sm text-[hsl(220,10%,42%)]">Analyzing CV...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && analysis && (
          <ul className="space-y-3">
            {analysis.strengths.map((s) => (
              <li
                key={s.skill}
                className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-[hsl(220,20%,14%)]">
                  <Star className="h-4 w-4 text-amber-500" />
                  {s.skill}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {s.score}/100
                </span>
              </li>
            ))}
          </ul>
        )}
      </AnalysisCard>

      <AnalysisCard title="Needs improvement" eyebrow="Gap map">
        {loading && <div className="text-sm text-[hsl(220,10%,42%)]">Analyzing CV...</div>}
        {!loading && analysis && (
          <ul className="space-y-3">
            {analysis.weaknesses.map((w) => (
              <li key={w.skill} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[hsl(220,20%,14%)]">{w.skill}</div>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    Gap {w.gap}
                  </span>
                </div>
                {w.tip && <div className="mt-1.5 text-xs leading-5 text-[hsl(220,10%,42%)]">{w.tip}</div>}
              </li>
            ))}
          </ul>
        )}
      </AnalysisCard>

      <AnalysisCard title="Skill radar" eyebrow="Coverage">
        {loading && <div className="text-sm text-[hsl(220,10%,42%)]">Analyzing CV...</div>}
        {!loading && analysis && <RadarPanel data={radarData} />}
      </AnalysisCard>

      <AnalysisCard title="Recommended industries" eyebrow="Best fit">
        {loading && <div className="text-sm text-[hsl(220,10%,42%)]">Analyzing CV...</div>}
        {!loading && analysis && (
          <div className="space-y-3">
            {analysis.industries.map((i) => (
              <div
                key={i.name}
                className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-emerald-900">{i.name}</div>
                    {i.rationale && <div className="mt-1 text-sm"><ExpandableText text={String(i.rationale)} lines={2} /></div>}
                  </div>
                  <div className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-bold text-white">{i.score}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      <AnalysisCard title="Other suitable roles" eyebrow="AI suggestions" className="md:col-span-2">
        {loading && <div className="text-sm text-[hsl(220,10%,42%)]">Analyzing CV...</div>}
        {!loading && analysis?.roles && (
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.roles.map((r) => (
              <div
                key={r.name}
                className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-indigo-900">{r.name}</div>
                    {r.rationale && <div className="mt-1 text-sm"><ExpandableText text={String(r.rationale)} lines={2} /></div>}
                  </div>
                  <div className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white">{r.score}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnalysisCard>

      {analysis?.explanations && analysis.explanations.length > 0 && (
        <AnalysisCard title="Why these suggestions?" eyebrow="Reasoning" className="md:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.explanations.map((e, i) => (
              <div key={i} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-[hsl(220,20%,14%)]">
                  {i % 2 === 0 ? <Sparkles className="h-4 w-4 text-[hsl(226,65%,42%)]" /> : <Target className="h-4 w-4 text-amber-500" />}
                  Insight {i + 1}
                </div>
                <ExpandableText text={String(e)} lines={4} />
              </div>
            ))}
          </div>
        </AnalysisCard>
      )}
    </div>
  );
}
