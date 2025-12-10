
import React, { useState } from 'react';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserType) => void;
  users: UserType[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
        setError('Please enter both username and password');
        return;
    }

    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const user = users.find(u => u.username === username);
      
      // Simple mock password check (in real app, use proper auth)
      if (user && password === '123') {
        onLogin(user);
      } else {
        setError('Invalid username or password');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10 transform -skew-y-12 scale-150 translate-y-4"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                <ShieldCheck className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-tight mb-1">ChronoGuard AI</h1>
             <p className="text-indigo-100 text-sm">Smart Timesheet Intelligence</p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="e.g. admin or alex"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all text-sm font-medium text-slate-700 ${error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all text-sm font-medium text-slate-700 ${error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400 mb-3">Demo Credentials (Password: 123)</p>
            <div className="flex justify-center gap-2 flex-wrap">
               <button onClick={() => { setUsername('admin'); setPassword('123'); setError(''); }} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 transition-colors">
                  Manager: admin
               </button>
               <button onClick={() => { setUsername('alex'); setPassword('123'); setError(''); }} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 transition-colors">
                  Employee: alex
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
