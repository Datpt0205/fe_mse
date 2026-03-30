"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Sparkles, Upload } from "lucide-react";

import SectionHeader from "@/components/common/SectionHeader";
import type { OcrResult } from "@/types/cv";
import { uploadCvToBackend } from "@/services/cvService";

export default function CVUploadCard({
  onOcrDone,
  allowDemo = true,
}: {
  onOcrDone: (res: OcrResult) => void;
  allowDemo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSelect(file?: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await uploadCvToBackend(file);
      setFileName(file.name);
      onOcrDone(res);
    } catch {
      setError("Upload/OCR failed. Use demo mode if the backend is not ready.");
    } finally {
      setUploading(false);
    }
  }

  function clickFile() {
    inputRef.current?.click();
  }

  async function demoOcr() {
    setUploading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 500));
    onOcrDone({
      text: "Senior Software Engineer with experience in RecSys, NLP, SQL, Python, FastAPI, AWS, Docker",
      skills: ["Python", "SQL", "FastAPI", "Docker", "AWS", "RecSys", "NLP", "Redis", "PostgreSQL"],
    });
    setFileName("demo_cv.pdf");
    setUploading(false);
  }

  return (
    <div className="card-elevated p-5">
      <SectionHeader
        icon={Upload}
        title="Upload CV to analyze"
        desc="Drop a file here to OCR and review skill signals instantly."
      />
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0])}
      />

      <div
        className={[
          "relative mt-2 overflow-hidden rounded-[1.4rem] border border-dashed p-6 text-center transition-all",
          dragOver
            ? "border-[hsl(226,70%,55%)] bg-[linear-gradient(135deg,rgba(224,231,255,0.8),rgba(255,255,255,0.98))] shadow-lg shadow-blue-100/80"
            : " bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))]",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onSelect(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="hero-orb right-6 top-6 h-20 w-20 bg-blue-200/80" />
        <div className="hero-orb bottom-4 left-8 h-16 w-16 bg-amber-200/80" />

        <div className="relative z-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,hsl(226,85%,96%),white)] shadow-sm ring-1 ring-white/80">
            <Upload className="h-7 w-7 text-[hsl(226,65%,42%)]" />
          </div>
          <p className="mt-4 text-base font-semibold text-[hsl(220,20%,14%)]">Drag and drop your CV here</p>
          <p className="mt-1 text-sm text-[hsl(220,10%,42%)]">
            Supports PDF, DOC, DOCX, PNG, JPG. OCR runs after upload.
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={clickFile} className="btn-primary inline-flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Select CV
            </button>
            {allowDemo && (
              <button type="button" onClick={demoOcr} className="btn-ghost inline-flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" />
                Use demo CV
              </button>
            )}
          </div>

          {uploading && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-[hsl(220,10%,42%)] shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing CV...
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-[hsl(220,10%,42%)]">
            <span className="chip chip-primary">OCR extract</span>
            <span className="chip chip-accent">Skill scan</span>
            <span className="chip chip-success">Analysis ready</span>
          </div>
        </div>
      </div>

      {fileName && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.22em] text-emerald-700/80">Current file</div>
            <div className="truncate text-sm font-medium text-emerald-950">{fileName}</div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
