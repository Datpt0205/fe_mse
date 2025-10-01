"use client";
import EmptyState from "@/components/common/EmptyState";
import type { Job } from "@/types/job";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 mr-2 mb-2">
      {children}
    </span>
  );
}

export default function SkillMatchPanel({ ocrSkills, job }:{ ocrSkills: string[]; job?: Job | null }){
  const lowerSkills = ocrSkills.map(s=>s.toLowerCase());
  const jobTags = (job?.tags||[]).map(s=>s.toLowerCase());
  const overlap = lowerSkills.filter(s => jobTags.includes(s));
  const coverage = jobTags.length ? Math.round((overlap.length / jobTags.length)*100) : 0;

  if (!job) return <EmptyState icon={(props:any)=> <svg {...props}/>} title="Select a job to match skills" desc="Click on the job tab on the left"/>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Matching level: {job.title}</div>
        <div className="text-sm text-gray-600">{coverage}%</div>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden" aria-label="skill coverage">
        <div className="h-full bg-gray-900" style={{ width: `${coverage}%` }} />
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Matching skills</div>
        <div className="flex flex-wrap">{overlap.length>0 ? overlap.map(s=> <Pill key={s}>{s}</Pill>) : <span className="text-sm text-gray-500">No matching skills</span>}</div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Missing skills (by job tags)</div>
        <div className="flex flex-wrap">{jobTags.filter(s=>!overlap.includes(s)).slice(0,8).map(s=> <Pill key={s}>{s}</Pill>)}</div>
      </div>
    </div>
  );
}
