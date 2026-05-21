import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { PlusCircle, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import firebaseConfig from '../firebase-applet-config.json';
import Header from './components/Header';
import DispatchForm from './components/DispatchForm';
import DispatchBoard from './components/DispatchBoard';
import AuthModal from './AuthModal';
import AuthNudge from './components/AuthNudge';
import ToastProvider from './components/Toast';
import type { Job } from './components/JobCard';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'form' | 'board'>('board');

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  // Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'dispatch_jobs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setJobs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
    }, err => {
      console.error('Firestore Error:', err.message);
    });
    return () => unsub();
  }, []);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      try {
        const token = await user.getIdToken();
        h['Authorization'] = `Bearer ${token}`;
      } catch {}
    }
    return h;
  };

  const handleAcceptJob = async (jobId: string) => {
    if (acceptingId) return;
    setAcceptingId(jobId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/accept-job', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId }),
      });
      if (res.status === 409) {
        toast.error('Job already taken by another courier!');
      } else if (res.status === 403) {
        toast.error('You cannot accept your own dispatch');
      } else if (res.status === 401) {
        toast.error('Sign in required to accept jobs');
      } else if (!res.ok) {
        throw new Error('Failed to accept job');
      } else {
        toast.success('✅ Job accepted! You\'re the courier.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/update-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId, newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update status');
      }
      const labels: Record<string, string> = {
        IN_TRANSIT: '🚚 Marked as picked up!',
        DELIVERED: '🎉 Delivery confirmed!',
        CANCELLED: '❌ Dispatch cancelled.',
      };
      toast.success(labels[newStatus] || 'Status updated!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090B] text-slate-200 overflow-hidden font-sans">
      <ToastProvider />

      <Header user={user} onSignIn={() => setShowAuth(true)} onSignOut={() => signOut(auth)} />

      {/* Desktop Layout: side-by-side */}
      <main className="flex-1 flex overflow-hidden">
        {/* Form Column — hidden on mobile when board tab active */}
        <section className={`w-full md:w-96 md:border-r border-slate-800 bg-[#0C0C0E]/50 p-4 md:p-6 flex flex-col md:shrink-0 overflow-y-auto custom-scrollbar ${mobileTab !== 'form' ? 'hidden md:flex' : 'flex'}`}>
          <DispatchForm user={user} onSignIn={() => setShowAuth(true)} />
        </section>

        {/* Board Column — hidden on mobile when form tab active */}
        <section className={`flex-1 p-4 md:p-8 bg-[#09090B] overflow-hidden ${mobileTab !== 'board' ? 'hidden md:block' : 'block'}`}>
          <DispatchBoard
            jobs={jobs}
            user={user}
            acceptingId={acceptingId}
            onAccept={handleAcceptJob}
            onUpdateStatus={handleUpdateStatus}
            onSignIn={() => setShowAuth(true)}
          />
        </section>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden h-14 bg-[#0C0C0E] border-t border-slate-800 flex shrink-0">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${mobileTab === 'form' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500'}`}
        >
          <PlusCircle className="w-4 h-4" /> New
        </button>
        <button
          onClick={() => setMobileTab('board')}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${mobileTab === 'board' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500'}`}
        >
          <LayoutGrid className="w-4 h-4" /> Board
        </button>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden md:flex h-10 bg-[#0C0C0E] border-t border-slate-800 items-center justify-between px-8 text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>v2.0.0</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-emerald-500/70">Powered by Groq &middot; Llama 3.3</span>
        </div>
        <div className="flex items-center gap-1 font-medium">
          <span>Engineered by</span>
          <span className="text-slate-300">Victor at SyncWave Solutions</span>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Auth Nudge for anonymous users */}
      {!user && <AuthNudge onSignUp={() => setShowAuth(true)} />}
    </div>
  );
}
