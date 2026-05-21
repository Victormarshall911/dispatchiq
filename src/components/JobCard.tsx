import { Loader2, CheckCircle2, Truck, XCircle, Package, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

interface Job {
  id: string;
  pickup_location: string;
  delivery_destination: string;
  item_description: string;
  offered_incentive_ngn: number;
  estimated_urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED';
  createdAt: any;
  createdBy?: string;
  acceptedBy?: string;
  acceptedAt?: any;
  pickedUpAt?: any;
  deliveredAt?: any;
  cancelledAt?: any;
}

interface JobCardProps {
  job: Job;
  currentUserId: string | null;
  acceptingId: string | null;
  onAccept: (jobId: string) => void;
  onUpdateStatus: (jobId: string, newStatus: string) => void;
  onSignIn: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Open', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  ASSIGNED: { label: 'Accepted', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_TRANSIT: { label: 'In Transit', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  EXPIRED: { label: 'Expired', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
};

const URGENCY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-500/10 text-red-400',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400',
  LOW: 'bg-blue-500/10 text-blue-400',
};

export type { Job };

export default function JobCard({ job, currentUserId, acceptingId, onAccept, onUpdateStatus, onSignIn }: JobCardProps) {
  const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING;
  const isDone = ['DELIVERED', 'CANCELLED', 'EXPIRED'].includes(job.status);
  const isOwnJob = currentUserId && job.createdBy === currentUserId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-[#16161A] border border-slate-800 rounded-2xl p-4 md:p-5 hover:border-emerald-500/30 transition-all group flex flex-col justify-between ${isDone ? 'opacity-50' : ''}`}
    >
      <div>
        {/* Status + Urgency + Price */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${status.bg} ${status.color}`}>
            {status.label}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${URGENCY_STYLE[job.estimated_urgency]}`}>
            {job.estimated_urgency}
          </span>
          <span className="ml-auto text-lg font-bold text-emerald-400 font-mono">
            ₦{job.offered_incentive_ngn?.toLocaleString()}
          </span>
        </div>

        {/* Item */}
        <h3 className="text-white font-medium mb-3 text-base md:text-lg flex items-start gap-2">
          <Package className="w-4 h-4 mt-1 text-slate-500 shrink-0" />
          {job.item_description}
        </h3>

        {/* Locations */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
            <span className="font-semibold text-slate-300">Pickup:</span> {job.pickup_location}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-300">Drop:</span> {job.delivery_destination}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {job.status === 'PENDING' && (
          <div className="flex gap-2">
            {!currentUserId ? (
              <button
                onClick={onSignIn}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign in to accept
              </button>
            ) : isOwnJob ? (
              <div className="flex-1 py-2.5 bg-slate-800/50 text-slate-500 rounded-lg text-xs font-bold text-center border border-slate-800 cursor-default">
                Your dispatch
              </div>
            ) : (
              <button
                onClick={() => onAccept(job.id)}
                disabled={!!acceptingId}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold transition-all border border-slate-700 active:scale-[0.98] disabled:opacity-50"
              >
                {acceptingId === job.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Accept Job'}
              </button>
            )}
            {isOwnJob && (
              <button
                onClick={() => onUpdateStatus(job.id, 'CANCELLED')}
                className="px-3 py-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-xs font-bold transition-all border border-slate-700"
                title="Cancel"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {job.status === 'ASSIGNED' && (
          <div className="flex gap-2">
            <button
              onClick={() => onUpdateStatus(job.id, 'IN_TRANSIT')}
              className="flex-1 py-2.5 bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-400 rounded-lg text-xs font-bold transition-all border border-orange-500/20 flex items-center justify-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" /> Mark Picked Up
            </button>
            <button
              onClick={() => onUpdateStatus(job.id, 'CANCELLED')}
              className="px-3 py-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-xs font-bold transition-all border border-slate-700"
              title="Cancel"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {job.status === 'IN_TRANSIT' && (
          <button
            onClick={() => onUpdateStatus(job.id, 'DELIVERED')}
            className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-lg text-xs font-bold transition-all border border-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Delivered
          </button>
        )}

        {job.status === 'DELIVERED' && (
          <div className="w-full py-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold border border-emerald-500/20 text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3 h-3" /> DELIVERED
          </div>
        )}

        {job.status === 'CANCELLED' && (
          <div className="w-full py-2.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold border border-red-500/20 text-center flex items-center justify-center gap-2">
            <XCircle className="w-3 h-3" /> CANCELLED
          </div>
        )}

        {job.status === 'EXPIRED' && (
          <div className="w-full py-2.5 bg-slate-500/10 text-slate-400 rounded-lg text-xs font-bold border border-slate-500/20 text-center">
            EXPIRED
          </div>
        )}
      </div>
    </motion.div>
  );
}
