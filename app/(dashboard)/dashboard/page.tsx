"use client";
import { useState } from "react";
import SectionHeader from "@/components/common/SectionHeader";
import JobsPanel from "@/components/jobs/JobsPanel";
import CVUploadCard from "@/components/cv/CVUploadCard";
import AnalysisPanel from "@/components/cv/AnalysisPanel";
import SkillMatchPanel from "@/components/cv/SkillMatchPanel";
import { AlertTriangle, Settings2, TrendingUp } from "lucide-react";
import type { OcrResult } from "@/types/cv";
import type { Job } from "@/types/job";
import { cn } from "@/lib/api";

export default function DashboardPage() {
  const [jobSource, setJobSource] = useState<"remotive" | "backend">("remotive");
  const [query, setQuery] = useState("software");
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 md:px-8 lg:px-10 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">JobRecs – Dashboard</h1>
          <p className="text-sm text-gray-600">Jobs • CV OCR • Analysis • Skill matching</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Job source:</span>
          <div className="flex rounded-xl overflow-hidden border">
            <button
              onClick={() => setJobSource("remotive")}
              className={cn("px-3 py-1.5 text-sm", jobSource === "remotive" ? "bg-gray-900 text-white" : "bg-white")}
            >Remotive</button>
            <button
              onClick={() => setJobSource("backend")}
              className={cn("px-3 py-1.5 text-sm", jobSource === "backend" ? "bg-gray-900 text-white" : "bg-white")}
            >My Backend</button>
          </div>
          <button className="ml-2 px-3 py-1.5 text-sm rounded-xl border bg-white hover:bg-gray-50 flex items-center gap-1">
            <Settings2 className="w-4 h-4"/>Optional
          </button>
        </div>
      </header>

      {/* LAYOUT 12 cột: trái 7, phải 5 */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT – Jobs */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <JobsPanel
            source={jobSource}
            query={query}
            onQueryChange={setQuery}
            ocrSkills={ocr?.skills || []}
            onSelectJob={setSelectedJob}
            selectedJobId={selectedJob?.id}
          />
        </div>

        {/* RIGHT – ưu tiên Phân tích CV trên cùng */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <CVUploadCard onOcrDone={(res)=>{ setOcr(res); setSelectedJob(null); }} allowDemo />
          <div className="border rounded-2xl p-4">
            <SectionHeader icon={TrendingUp} title="Analyze CV" desc="Strengths/Weaknesses + Recommended industry/role" />
            <AnalysisPanel ocr={ocr} useBackend={true} />
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              NOTE: When bakend ready, set useBackend=true to call real endpoint.
            </div>
          </div>


          <div className="border rounded-2xl p-4">
            <SectionHeader icon={TrendingUp} title="Match skills with selected jobs" desc="Based on job vs skills tags from CV" />
            <SkillMatchPanel ocrSkills={ocr?.skills || []} job={selectedJob} />
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} JobRecs Demo. For academic use only.
      </footer>
    </div>
  );
}
