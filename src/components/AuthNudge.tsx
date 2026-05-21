import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface AuthNudgeProps {
  onSignUp: () => void;
}

const NUDGE_DISMISSED_KEY = 'dispatchiq_auth_nudge_dismissed';

export default function AuthNudge({ onSignUp }: AuthNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show nudge after 3 seconds if not previously dismissed
    const wasDismissed = localStorage.getItem(NUDGE_DISMISSED_KEY);
    if (wasDismissed) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(NUDGE_DISMISSED_KEY, 'true');
  };

  const handleSignUp = () => {
    dismiss();
    onSignUp();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={dismiss}>
      <div
        className="bg-[#16161A] border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 mx-4 sm:mx-0 relative animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={dismiss} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Save Your Progress</h3>
            <p className="text-xs text-slate-500">Track and manage your dispatches</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-5 leading-relaxed">
          Sign up to save your dispatch history, filter your own jobs, and get notified when someone accepts your delivery request.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleSignUp}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-colors text-sm"
          >
            Sign Up
          </button>
          <button
            onClick={dismiss}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors text-sm border border-slate-700"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
