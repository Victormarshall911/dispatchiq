import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Send, Package, MapPin, Loader2, Sparkles, Zap, MessageSquare, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

interface DispatchFormProps {
  user: User | null;
  onSignIn: () => void;
}

export default function DispatchForm({ user, onSignIn }: DispatchFormProps) {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [pay, setPay] = useState('');
  const [urgency, setUrgency] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<'form' | 'ai'>('form');
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggested_price: number; suggested_urgency: string; reasoning: string } | null>(null);

  const canSubmit = pickup.trim() && destination.trim() && itemDesc.trim() && pay.trim();

  const getHeaders = async (): Promise<Record<string, string>> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      try {
        const token = await user.getIdToken();
        h['Authorization'] = `Bearer ${token}`;
      } catch {}
    }
    return h;
  };

  const handleAIParse = async () => {
    if (!aiText.trim() || aiParsing) return;
    setAiParsing(true);
    try {
      const h = await getHeaders();
      const res = await fetch('/api/parse-dispatch', { method: 'POST', headers: h, body: JSON.stringify({ text: aiText }) });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || 'AI parsing failed'); }
      const data = await res.json();
      setPickup(data.pickup_location || ''); setDestination(data.delivery_destination || '');
      setItemDesc(data.item_description || ''); setPay(String(data.offered_incentive_ngn || ''));
      setUrgency(data.estimated_urgency || 'MEDIUM'); setAiText(''); setInputMode('form');
      toast.success('AI parsed your request! Review & submit.');
    } catch (err: any) { toast.error(err.message); } finally { setAiParsing(false); }
  };

  const handleSmartSuggest = async () => {
    if (!pickup.trim() || !destination.trim() || !itemDesc.trim() || suggesting) return;
    setSuggesting(true); setSuggestion(null);
    try {
      const h = await getHeaders();
      const res = await fetch('/api/ai-suggest', { method: 'POST', headers: h, body: JSON.stringify({ pickup_location: pickup.trim(), delivery_destination: destination.trim(), item_description: itemDesc.trim() }) });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || 'Suggestion failed'); }
      setSuggestion(await res.json());
    } catch (err: any) { toast.error(err.message); } finally { setSuggesting(false); }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setPay(String(suggestion.suggested_price)); setUrgency(suggestion.suggested_urgency as any); setSuggestion(null);
    toast.success('Suggestion applied!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const h = await getHeaders();
      const res = await fetch('/api/create-dispatch', { method: 'POST', headers: h, body: JSON.stringify({ pickup_location: pickup.trim(), delivery_destination: destination.trim(), item_description: itemDesc.trim(), offered_incentive_ngn: Number(pay), estimated_urgency: urgency }) });
      if (!res.ok) throw new Error('Failed to create dispatch');
      setPickup(''); setDestination(''); setItemDesc(''); setPay(''); setUrgency('MEDIUM'); setSuggestion(null);
      toast.success('🚀 Dispatch posted to the board!');
    } catch (err: any) { toast.error(err.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Auth gate overlay for anonymous users */}
      {!user && (
        <div className="absolute inset-0 z-10 bg-[#0C0C0E]/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-4 p-6">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <LogIn className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-white text-center">Sign in to post dispatches</h3>
          <p className="text-xs text-slate-500 text-center">You need an account to create delivery requests</p>
          <button onClick={onSignIn} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors text-sm">Sign In</button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">New Dispatch</h2>
        <p className="text-xs text-slate-500">Create a delivery request.</p>
      </div>

      {/* AI/Form Toggle */}
      <div className="flex gap-1 bg-[#0C0C0E] rounded-lg p-1 mb-4">
        <button type="button" onClick={() => setInputMode('form')} className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${inputMode === 'form' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
          <Zap className="w-3 h-3" /> Quick Form
        </button>
        <button type="button" onClick={() => setInputMode('ai')} className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${inputMode === 'ai' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
          <Sparkles className="w-3 h-3" /> AI Quick Fill
        </button>
      </div>

      {/* AI Natural Language */}
      {inputMode === 'ai' && (
        <div className="mb-4 space-y-3">
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-emerald-500/50" />
            <textarea value={aiText} onChange={e => setAiText(e.target.value)} disabled={aiParsing} rows={4}
              className="w-full bg-[#16161A] border border-emerald-500/20 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
              placeholder="e.g. 'Bring my charger from Alvan block to CDS hall, ₦300, urgent'" />
          </div>
          <button type="button" onClick={handleAIParse} disabled={aiParsing || !aiText.trim()} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            {aiParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> AI is parsing...</> : <><Sparkles className="w-4 h-4" /> Parse with AI</>}
          </button>
          <p className="text-[10px] text-slate-600 text-center">AI will extract pickup, destination, item &amp; price</p>
        </div>
      )}

      {/* Structured Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pickup Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="text" value={pickup} onChange={e => setPickup(e.target.value)} disabled={isSubmitting}
              className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors" placeholder="e.g. Engineering Auditorium" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Destination</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)} disabled={isSubmitting}
              className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors" placeholder="e.g. Main Gate Hostels" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">What needs delivering?</label>
          <div className="relative">
            <Package className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
            <textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} disabled={isSubmitting} rows={2}
              className="w-full bg-[#16161A] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors" placeholder="e.g. Lab coat in a black bag" />
          </div>
        </div>

        {/* Smart Suggest */}
        {pickup.trim() && destination.trim() && itemDesc.trim() && (
          <button type="button" onClick={handleSmartSuggest} disabled={suggesting} className="w-full py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] font-bold text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-2">
            {suggesting ? <><Loader2 className="w-3 h-3 animate-spin" /> AI is thinking...</> : <><Sparkles className="w-3 h-3" /> AI Suggest Price &amp; Urgency</>}
          </button>
        )}
        {suggestion && (
          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Suggestion</span>
              <button type="button" onClick={() => setSuggestion(null)} className="text-[10px] text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-emerald-400">₦{suggestion.suggested_price.toLocaleString()}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${suggestion.suggested_urgency === 'HIGH' ? 'bg-red-500/10 text-red-400' : suggestion.suggested_urgency === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>{suggestion.suggested_urgency}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">{suggestion.reasoning}</p>
            <button type="button" onClick={applySuggestion} className="w-full py-1.5 bg-purple-500 hover:bg-purple-400 text-white text-[10px] font-bold rounded-lg transition-colors">Apply Suggestion</button>
          </div>
        )}

        {/* Pay & Urgency */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pay (₦)</label>
            <input type="number" value={pay} onChange={e => setPay(e.target.value)} disabled={isSubmitting} min="0"
              className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors" placeholder="500" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Urgency</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value as any)} disabled={isSubmitting}
              className="w-full bg-[#16161A] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer">
              <option value="LOW">🟢 Low</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="HIGH">🔴 High</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting || !canSubmit} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] mt-1">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : <>Post Dispatch <Send className="w-4 h-4" /></>}
        </button>
      </form>
    </div>
  );
}
