"use client";
import { Bookmark, BookmarkCheck, Building2, ExternalLink, MapPin, Star } from "lucide-react";
import type { Job } from "@/types/job";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 mr-2 mb-2">
      {children}
    </span>
  );
}

export default function JobCard({ job, selected, onSelect, saved, onToggleSave }:{
  job: Job; selected?: boolean; onSelect?: (j: Job)=>void; saved?: boolean; onToggleSave?: ()=>void
}){
  const matchBadge = job.tags?.slice(0,3) || [];
  return (
    <div className={`border rounded-xl p-4 hover:shadow-sm transition cursor-pointer ${selected ? "ring-2 ring-gray-900" : ""}`} onClick={() => onSelect?.(job)}>
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 leading-tight truncate flex items-center gap-2">
            {job.title} {selected && <Star className="w-4 h-4 text-amber-500"/>}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
            <Building2 className="w-4 h-4"/> {job.company}
            <MapPin className="w-4 h-4 ml-2"/> {job.location}
          </p>
          {matchBadge.length>0 && (
            <div className="mt-2 flex flex-wrap">{matchBadge.map((t) => <Pill key={t}>{t}</Pill>)}</div>
          )}
        </div>
        <div className="text-right min-w-[130px]">
          {job.published_at && <p className="text-xs text-gray-500">{new Date(job.published_at).toLocaleDateString()}</p>}
          {job.salary && <p className="text-sm font-medium text-emerald-700">{job.salary}</p>}
          <div className="flex items-center justify-end gap-2 mt-2">
            <a className="text-xs underline text-gray-700 flex items-center gap-1" href={job.url} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()}>
              Mở <ExternalLink className="w-3 h-3"/>
            </a>
            <button onClick={(e)=>{e.stopPropagation(); onToggleSave?.();}} className="p-1 rounded hover:bg-gray-100" aria-label="save">
              {saved ? <BookmarkCheck className="w-4 h-4 text-emerald-600"/> : <Bookmark className="w-4 h-4"/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
