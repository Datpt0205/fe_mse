"use client";
import { Filter, Loader2, Search, Briefcase } from "lucide-react";
import JobCard from "@/components/jobs/JobCard";
import EmptyState from "@/components/common/EmptyState";
import SectionHeader from "@/components/common/SectionHeader";
import type { Job } from "@/types/job";
import { fetchJobsFromBackend, fetchJobsFromRemotive } from "@/services/jobService";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

function JobsFilters({ query, setQuery, location, setLocation, type, setType, seniority, setSeniority, minSalary, setMinSalary, onSearch }:{
  query: string; setQuery: (v:string)=>void;
  location: string; setLocation: (v:string)=>void;
  type: string; setType: (v:string)=>void;
  seniority: string; setSeniority: (v:string)=>void;
  minSalary: number | undefined; setMinSalary: (v:number|undefined)=>void;
  onSearch: ()=>void;
}){
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
      <div className="md:col-span-2 flex">
        <input
          className="flex-1 border rounded-l-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="Từ khoá (data engineer, recsys, react)"
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          onKeyDown={(e)=> e.key === "Enter" && onSearch()}
        />
        <button onClick={onSearch} className="px-4 rounded-r-xl border bg-gray-900 text-white hover:opacity-90"><Search className="w-4 h-4"/></button>
      </div>
      <input className="border rounded-xl px-3 py-2" placeholder="Địa điểm" value={location} onChange={e=>setLocation(e.target.value)}/>
      <select className="border rounded-xl px-3 py-2" value={type} onChange={e=>setType(e.target.value)}>
        <option value="">Loại hình</option>
        <option value="remote">Remote</option>
        <option value="hybrid">Hybrid</option>
        <option value="onsite">Onsite</option>
      </select>
      <select className="border rounded-xl px-3 py-2" value={seniority} onChange={e=>setSeniority(e.target.value)}>
        <option value="">Cấp bậc</option>
        <option value="junior">Junior</option>
        <option value="mid">Mid</option>
        <option value="senior">Senior</option>
      </select>
      <input className="border rounded-xl px-3 py-2" type="number" min={0} placeholder="Lương tối thiểu" value={minSalary ?? ""} onChange={e=>setMinSalary(e.target.value? Number(e.target.value): undefined)}/>
    </div>
  );
}

export default function JobsPanel({ source, query, onQueryChange, ocrSkills, onSelectJob, selectedJobId }:{
  source: "remotive" | "backend";
  query: string; onQueryChange: (s: string) => void;
  ocrSkills: string[];
  onSelectJob: (job: Job)=>void;
  selectedJobId?: string | null;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [seniority, setSeniority] = useState("");
  const [minSalary, setMinSalary] = useState<number | undefined>(undefined);

  const [savedJobs, setSavedJobs] = useLocalStorage<string[]>("sav.jobs", []);
  const [page, setPage] = useState(1);

  const savedSet = useMemo(()=> new Set(savedJobs), [savedJobs]);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setPage(1);
    try {
      const list = source === "remotive"
        ? await fetchJobsFromRemotive(query)
        : await fetchJobsFromBackend({ q: query, location, type, seniority, minSalary });
      setJobs(list);
    } catch (e: any) {
      setError(e?.message || "Lỗi tải job");
    } finally { setLoading(false); }
  }, [source, query, location, type, seniority, minSalary]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(()=>{
    let out = jobs;
    if (location) out = out.filter(j => j.location.toLowerCase().includes(location.toLowerCase()));
    if (type) out = out.filter(j => (type === "remote" ? /remote/i.test(j.location) : true));
    if (minSalary && out[0]?.salary) {
      const min = Number(minSalary);
      out = out.filter(j => {
        const n = Number(String(j.salary).replace(/[^0-9]/g, ""));
        return isFinite(n) ? n >= min : true;
      });
    }
    if (seniority) out = out.filter(j => (j.tags||[]).join(" ").toLowerCase().includes(seniority));
    return out;
  }, [jobs, location, type, seniority, minSalary]);

  const PAGE_SIZE = 12;
  const paged = filtered.slice(0, page * PAGE_SIZE);

  const onSearch = () => load();

  const toggleSave = (id: string) => {
    setSavedJobs(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={Search} title="Việc làm gợi ý" desc={source === "remotive" ? "Remotive (demo)" : "Backend của bạn"} />
        <div className="text-xs text-gray-500 flex items-center gap-1"><Filter className="w-3 h-3"/>{filtered.length} kết quả</div>
      </div>

      <JobsFilters
        query={query} setQuery={onQueryChange}
        location={location} setLocation={setLocation}
        type={type} setType={setType}
        seniority={seniority} setSeniority={setSeniority}
        minSalary={minSalary} setMinSalary={setMinSalary}
        onSearch={onSearch}
      />

      {loading && (
        <div className="flex items-center gap-2 text-gray-600 mt-3"><Loader2 className="w-4 h-4 animate-spin"/> Đang tải job...</div>
      )}
      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

      {!loading && !error && (
        paged.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {paged.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                selected={selectedJobId === j.id}
                onSelect={onSelectJob}
                saved={savedSet.has(j.id)}
                onToggleSave={()=>toggleSave(j.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Briefcase} title="Không có kết quả" desc="Thử đổi từ khóa hoặc bộ lọc."/>
        )
      )}

      {paged.length < filtered.length && (
        <div className="flex justify-center mt-4">
          <button className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50" onClick={()=>setPage(p=>p+1)}>Tải thêm</button>
        </div>
      )}

      {ocrSkills.length > 0 && (
        <p className="text-xs text-gray-500 mt-3">Gợi ý: chọn 1 job để xem <b>mức độ khớp kỹ năng</b> với CV của bạn ở panel bên phải.</p>
      )}
    </div>
  );
}
