import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, ChevronUp, ChevronDown, CheckCircle2, Shield } from 'lucide-react';

export const QuickDemoSwitcher: React.FC = () => {
  const { currentUser, demoSwitchUser, loading } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const demoUsers = [
    { id: 1, name: 'Arjun Sharma', role: 'Offers: Web Dev | Needs: Plumbing', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', trust: 94 },
    { id: 2, name: 'Ravi Kumar', role: 'Offers: Plumbing | Needs: Web Dev (1.8 km)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', trust: 94 },
    { id: 3, name: 'Ananya Rao', role: 'Offers: UI Design | Needs: Photography', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', trust: 91 },
    { id: 4, name: 'Priya Sharma', role: 'Offers: Photography | Needs: Carpentry', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', trust: 96 },
    { id: 5, name: 'Admin User', role: 'Community Safety & Operations', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80', trust: 100, isAdmin: true },
  ];

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-300 p-2 text-slate-800 transition-all duration-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold hover:text-emerald-700 transition-colors focus:outline-none"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Demo Persona: <strong className="text-slate-900">{currentUser ? currentUser.full_name : 'Guest'}</strong></span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1 w-72 max-h-80 overflow-y-auto">
            <p className="text-[10px] text-slate-400 font-medium px-2 uppercase tracking-wider">
              1-Click Persona Switcher for CEO Demo
            </p>
            {demoUsers.map((u) => {
              const isSelected = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  disabled={loading}
                  onClick={async () => {
                    await demoSwitchUser(u.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-medium border border-emerald-200/80'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate flex items-center gap-1">
                        {u.name}
                        {u.isAdmin && <Shield className="w-3 h-3 text-amber-600 fill-amber-500" />}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {u.trust}★
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 truncate">{u.role}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
