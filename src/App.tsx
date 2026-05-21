import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Send, Package, MapPin, Clock, AlertCircle, CheckCircle2, ChevronRight, Loader2, Sparkles, LogOut, UserCircle, Zap, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import firebaseConfig from '../firebase-applet-config.json';
import AuthModal from './AuthModal';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

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
  createdBy?: string;
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [pay, setPay] = useState('');
  const [urgency, setUrgency] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Mode state
  const [inputMode, setInputMode] = useState<'form' | 'ai'>('form');
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  // Smart Suggest state
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggested_price: number; suggested_urgency: string; reasoning: string } | null>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showMyJobs, setShowMyJobs] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

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

  const canSubmit = pickup.trim() && destination.trim() && itemDesc.trim() && pay.trim();

  // AI Quick Fill — parse natural language into structured fields
  const handleAIParse = async () => {
    if (!aiText.trim() || aiParsing) return;
    setAiParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'AI parsing failed');
      }
      const data = await response.json();

      // Auto-fill the structured fields
      setPickup(data.pickup_location || '');
      setDestination(data.delivery_destination || '');
      setItemDesc(data.item_description || '');
      setPay(String(data.offered_incentive_ngn || ''));
      setUrgency(data.estimated_urgency || 'MEDIUM');
      setAiText('');
      setInputMode('form'); // Switch to form to review
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiParsing(false);
    }
  };

  // AI Smart Suggest — recommend price & urgency
  const handleSmartSuggest = async () => {
    if (!pickup.trim() || !destination.trim() || !itemDesc.trim() || suggesting) return;
    setSuggesting(true);
    setSuggestion(null);

    try {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: pickup.trim(),
          delivery_destination: destination.trim(),
          item_description: itemDesc.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'AI suggestion failed');
      }
      const data = await response.json();
      setSuggestion(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setPay(String(suggestion.suggested_price));
    setUrgency(suggestion.suggested_urgency as 'HIGH' | 'MEDIUM' | 'LOW');
    setSuggestion(null);
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/create-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: pickup.trim(),
          delivery_destination: destination.trim(),
          item_description: itemDesc.trim(),
          offered_incentive_ngn: Number(pay),
          estimated_urgency: urgency,
          ...(user ? { createdBy: user.uid } : {}),
        }),
      });

      if (!response.ok) throw new Error('Failed to create dispatch');
      
      setPickup('');
      setDestination('');
      setItemDesc('');
      setPay('');
      setUrgency('MEDIUM');
      setSuggestion(null);
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
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{user.email}</span>
              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
            >
              <UserCircle className="w-3.5 h-3.5" /> Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Create Dispatch Column */}
        <section className="w-96 border-r border-slate-800 bg-[#0C0C0E]/50 p-6 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">New Dispatch</h2>
            <p className="text-xs text-slate-500">Create a delivery request.</p>
          </div>

          {/* AI Mode Toggle */}
          <div className="flex gap-1 bg-[#0C0C0E] rounded-lg p-1 mb-4">
            <button
              type="button"
              onClick={() => setInputMode('form')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${inputMode === 'form' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Zap className="w-3 h-3" /> Quick Form
            </button>
            <button
              type="button"
              onClick={() => setInputMode('ai')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${inputMode === 'ai' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Sparkles className="w-3 h-3" /> AI Quick Fill
            </button>
          </div>

          {/* AI Mode — Natural Language Input */}
          {inputMode === 'ai' && (
            <div className="mb-4 space-y-3">
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-emerald-500/50" />
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  disabled={aiParsing}
                  rows={4}
                  className="w-full bg-[#16161A] border border-emerald-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                  placeholder="Describe your delivery in plain English... e.g. 'I need someone to bring my charger from Alvan block to CDS hall, I'll pay 300 naira, it's urgent'"
                />
              </div>
              <button
                type="button"
                onClick={handleAIParse}
                disabled={aiParsing || !aiText.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {aiParsing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gemini is parsing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Parse with AI</>
                )}
              </button>
              <p className="text-[10px] text-slate-600 text-center">Gemini will extract pickup, destination, item & price automatically</p>
            </div>
          )}
          
          {/* Structured Form */}
          <form onSubmit={handleCreateDispatch} className="flex-1 flex flex-col space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="e.g. Engineering Auditorium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="e.g. Main Gate Hostels"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">What needs delivering?</label>
              <div className="relative">
                <Package className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                  placeholder="e.g. Lab coat in a black bag"
                />
              </div>
            </div>

            {/* AI Smart Suggest Button */}
            {pickup.trim() && destination.trim() && itemDesc.trim() && (
              <button
                type="button"
                onClick={handleSmartSuggest}
                disabled={suggesting}
                className="w-full py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] font-bold text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-2"
              >
                {suggesting ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> AI is thinking...</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> AI Suggest Price &amp; Urgency</>
                )}
              </button>
            )}

            {/* AI Suggestion Chip */}
            {suggestion && (
              <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Suggestion</span>
                  <button type="button" onClick={() => setSuggestion(null)} className="text-[10px] text-slate-500 hover:text-slate-300">✕</button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-bold text-emerald-400">₦{suggestion.suggested_price.toLocaleString()}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    suggestion.suggested_urgency === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                    suggestion.suggested_urgency === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>{suggestion.suggested_urgency}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{suggestion.reasoning}</p>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="w-full py-1.5 bg-purple-500 hover:bg-purple-400 text-white text-[10px] font-bold rounded-lg transition-colors"
                >
                  Apply Suggestion
                </button>
              </div>
            )}

            {/* Pay & Urgency Row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pay (₦)</label>
                <input
                  type="number"
                  value={pay}
                  onChange={(e) => setPay(e.target.value)}
                  disabled={isSubmitting}
                  min="0"
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                  disabled={isSubmitting}
                  className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                >
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🔴 High</option>
                </select>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] mt-1"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</>
              ) : (
                <>Post Dispatch <Send className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-[10px] text-red-400">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}
        </section>

        {/* Dispatch Board Column */}
        <section className="flex-1 p-8 bg-[#09090B] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Live Dispatch Board</h2>
            <div className="flex gap-2">
              {user && (
                <button
                  onClick={() => setShowMyJobs(!showMyJobs)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                    showMyJobs ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  My Dispatches
                </button>
              )}
              <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 uppercase">Active Jobs: {jobs.filter(j => j.status === 'PENDING').length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
            <AnimatePresence mode="popLayout">
              {jobs.filter(j => !showMyJobs || j.createdBy === user?.uid).map((job) => (
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

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
