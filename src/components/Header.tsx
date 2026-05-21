import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, UserCircle, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export default function Header({ user, onSignIn, onSignOut }: HeaderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="h-14 md:h-16 border-b border-slate-800 bg-[#0C0C0E] flex items-center justify-between px-4 md:px-8 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
          dispatch<span className="text-emerald-400">IQ</span>
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Reactive Online/Offline Status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline text-[10px] font-medium text-slate-400 uppercase tracking-widest">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline text-[10px] font-medium text-red-400 uppercase tracking-widest">Offline</span>
            </>
          )}
        </div>

        {/* Auth Controls */}
        {user ? (
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden md:inline text-[11px] text-slate-400 truncate max-w-[140px]">{user.email}</span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
          >
            <UserCircle className="w-3.5 h-3.5" /> Sign In
          </button>
        )}
      </div>
    </header>
  );
}
