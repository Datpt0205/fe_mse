"use client";
import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import type { OcrResult } from "@/types/cv";
import { uploadCvToBackend } from "@/services/cvService";

export default function CVUploadCard({ onOcrDone, allowDemo = true }: { onOcrDone: (res: OcrResult) => void; allowDemo?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function onSelect(file?: File | null) {
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const res = await uploadCvToBackend(file);
      onOcrDone(res);
    } catch {
      setError("Không thể upload/OCR. Hãy dùng DEMO nếu BE chưa sẵn sàng.");
    } finally { setUploading(false); }
  }

  function clickFile() { inputRef.current?.click(); }

  async function demoOcr() {
    setUploading(true); setError(null);
    await new Promise(r=>setTimeout(r,500));
    onOcrDone({
      text: "Senior Software Engineer với kinh nghiệm RecSys, NLP, SQL, Python, FastAPI, AWS, Docker",
      skills: ["Python", "SQL", "FastAPI", "Docker", "AWS", "RecSys", "NLP", "Redis", "PostgreSQL"]
    });
    setUploading(false);
  }

  return (
    <div className="border rounded-2xl p-4">
      <SectionHeader icon={Upload} title="Tải CV để phân tích" desc="Kéo thả hoặc chọn tệp (PDF/DOC/DOCX/PNG/JPG)" />
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(e) => onSelect(e.target.files?.[0])} />

      <div
        className={`mt-2 border-2 border-dashed rounded-xl p-6 text-center ${dragOver ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}
        onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }}
        onDragLeave={()=> setDragOver(false)}
        onDrop={(e)=>{ e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; onSelect(f); }}
      >
        <p className="text-sm text-gray-600">Kéo thả CV vào đây</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={clickFile} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 flex items-center gap-2">
            <FileText className="w-4 h-4"/> Chọn tệp CV
          </button>
          {allowDemo && (
            <button type="button" onClick={demoOcr} className="px-4 py-2 rounded-xl border bg-gray-900 text-white hover:opacity-90">
              DEMO OCR
            </button>
          )}
          {uploading && <span className="inline-flex items-center gap-2 text-gray-600"><Loader2 className="w-4 h-4 animate-spin"/> Đang xử lý...</span>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <p className="text-xs text-gray-500 mt-2">* FE chỉ upload tệp và gọi API OCR ở Backend của bạn.</p>
    </div>
  );
}
