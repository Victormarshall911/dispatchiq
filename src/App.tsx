import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { Send, Package, MapPin, Clock, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

enum OperationType {
  LIST = 'list',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: null, // Simple app for now
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface Job {
  id: string;
  pickup_location: string;
  delivery_destination: string;
  item_description: string;
  offered_incentive_ngn: number;
  estimated_urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'ASSIGNED';
  createdAt: any;
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'dispatch_jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'dispatch_jobs');
    });

    return () => unsubscribe();
  }, []);

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) throw new Error('Failed to parse dispatch');
      
      setInputText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (acceptingId) return;
    setAcceptingId(jobId);
    setError(null);

    try {
      const response = await fetch('/api/accept-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (response.status === 409) {
        alert('Job already taken by another courier!');
      } else if (!response.ok) {
        throw new Error('Failed to accept job');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090B] text-slate-200 overflow-hidden font-sans">
      {/* Global Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0C0C0E] flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">dispatch<span className="text-emerald-400">IQ</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Network: Online</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Create Dispatch Column */}
        <section className="w-80 border-r border-slate-800 bg-[#0C0C0E]/50 p-6 flex flex-col shrink-0">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">New Dispatch</h2>
            <p className="text-xs text-slate-500">Describe your request in natural language.</p>
          </div>
          
          <form onSubmit={handleCreateDispatch} className="flex-1 flex flex-col space-y-4">
            <div className="relative flex-1">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-full bg-[#16161A] border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                placeholder="I need someone to bring a lab coat from the Engineering Auditorium to the Main Gate hostels for 500 Naira..."
              ></textarea>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-slate-500 bg-black/40 px-2 py-1 rounded">
                <Loader2 className={`w-3 h-3 text-emerald-400 ${isSubmitting ? 'animate-spin' : ''}`} />
                NLP Engine Active
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={isSubmitting || !inputText.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
            >
              {isSubmitting ? 'Analyzing...' : 'Analyze & Post'}
              {!isSubmitting && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-[10px] text-red-400">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-3 tracking-widest">Recent Events</h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-1 h-8 bg-emerald-500/20 rounded-full"></div>
                <div>
                  <p className="text-xs text-slate-300">System Ready</p>
                  <p className="text-[10px] text-slate-500">Live for connections</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dispatch Board Column */}
        <section className="flex-1 p-8 bg-[#09090B] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Live Dispatch Board</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 uppercase">Active Jobs: {jobs.filter(j => j.status === 'PENDING').length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
            <AnimatePresence mode="popLayout">
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-[#16161A] border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group flex flex-col justify-between ${
                    job.status === 'ASSIGNED' ? 'opacity-50' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
                        job.estimated_urgency === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                        job.estimated_urgency === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        Urgency: {job.estimated_urgency}
                      </div>
                      <div className="text-lg font-bold text-emerald-400 italic font-mono uppercase">
                        ₦{job.offered_incentive_ngn.toLocaleString()}
                      </div>
                    </div>
                    <h3 className="text-white font-medium mb-4 text-lg">{job.item_description}</h3>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>
                        <span className="font-semibold text-slate-300">Pickup:</span> {job.pickup_location}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="font-semibold text-slate-300">Drop:</span> {job.delivery_destination}
                      </div>
                    </div>
                  </div>

                  {job.status === 'PENDING' ? (
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={!!acceptingId}
                      className="w-full py-2.5 bg-slate-800 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold transition-all border border-slate-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      {acceptingId === job.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Accept Job'}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold border border-emerald-500/20 text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      ASSIGNED
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {jobs.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-600 space-y-4 border border-dashed border-slate-800 rounded-3xl">
                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-medium tracking-wide uppercase">Waiting for new campus dispatches...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Bar */}
      <footer className="h-10 bg-[#0C0C0E] border-t border-slate-800 flex items-center justify-between px-8 text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>v1.0.4-stable</span>
          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
          <span className="text-emerald-500/70">Powered by Gemini NLP Engine</span>
        </div>
        <div className="flex items-center gap-1 font-medium">
          <span>Engineered by</span>
          <span className="text-slate-300">Victor at SyncWave Solutions</span>
        </div>
      </footer>
    </div>
  );
}
