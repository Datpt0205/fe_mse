"use client";
import { useState } from "react";

export default function ExpandableText({
  text,
  lines = 3,
  className = "",
}: { text: string; lines?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const needClamp = text.length > 120;
  return (
    <div className={className}>
      <p className={`${open ? "" : `line-clamp-${lines}`} break-words whitespace-pre-wrap text-sm text-gray-700`}>
        {text}
      </p>
      {needClamp && (
        <button
          onClick={() => setOpen(v => !v)}
          className="mt-1 text-xs text-gray-900 underline hover:opacity-80"
        >
          {open ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
