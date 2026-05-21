import { useState } from 'react';
import { User } from 'firebase/auth';
import { Search, Filter } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import JobCard from './JobCard';
import type { Job } from './JobCard';

interface DispatchBoardProps {
  jobs: Job[];
  user: User | null;
  acceptingId: string | null;
  onAccept: (jobId: string) => void;
  onUpdateStatus: (jobId: string, newStatus: string) => void;
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const;
const URGENCY_FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export default function DispatchBoard({ jobs, user, acceptingId, onAccept, onUpdateStatus }: DispatchBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [showMyJobs, setShowMyJobs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredJobs = jobs.filter(job => {
    if (showMyJobs && user && job.createdBy !== user.uid) return false;
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    if (urgencyFilter !== 'ALL' && job.estimated_urgency !== urgencyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        job.item_description?.toLowerCase().includes(q) ||
        job.pickup_location?.toLowerCase().includes(q) ||
        job.delivery_destination?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = jobs.filter(j => j.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-white">Live Board</h2>
          <div className="flex gap-2">
            {user && (
              <button onClick={() => setShowMyJobs(!showMyJobs)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${showMyJobs ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                My Jobs
              </button>
            )}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${showFilters ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-400'}`}>
              <Filter className="w-3 h-3" /> Filters
            </button>
            <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 uppercase">
              Active: {activeCount}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            placeholder="Search by item, pickup, or destination..."
          />
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <div className="flex flex-col gap-2 p-3 bg-[#16161A] border border-slate-800 rounded-xl">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Status</span>
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${statusFilter === s ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    {s === 'ALL' ? 'All' : s === 'IN_TRANSIT' ? 'In Transit' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Urgency</span>
              <div className="flex flex-wrap gap-1">
                {URGENCY_FILTERS.map(u => (
                  <button key={u} onClick={() => setUrgencyFilter(u)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${urgencyFilter === u ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    {u === 'ALL' ? 'All' : u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Job Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} acceptingId={acceptingId} onAccept={onAccept} onUpdateStatus={onUpdateStatus} />
            ))}
          </AnimatePresence>
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-20 md:py-32 flex flex-col items-center justify-center text-slate-600 space-y-4 border border-dashed border-slate-800 rounded-3xl mt-4">
            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium tracking-wide uppercase">
              {searchQuery || statusFilter !== 'ALL' || urgencyFilter !== 'ALL'
                ? 'No dispatches match your filters'
                : 'Waiting for new campus dispatches...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
