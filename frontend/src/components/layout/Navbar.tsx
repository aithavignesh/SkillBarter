import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Repeat,
  Compass,
  Sparkles,
  ArrowLeftRight,
  MessageSquare,
  Bell,
  Search,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Shield,
  Check,
  Coins
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const navLinks = [
    { label: 'Home', path: '/feed', icon: Repeat },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Matches', path: '/matches', icon: Sparkles, highlight: true },
    { label: 'Exchanges', path: '/exchanges', icon: ArrowLeftRight },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to={currentUser ? '/feed' : '/'} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Repeat className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Skill<span className="text-emerald-600">Barter</span></span>
            <span className="hidden sm:block text-[10px] font-medium text-slate-500 -mt-1 tracking-wider uppercase">Zero-Cash Community</span>
          </div>
        </Link>

        {currentUser && (
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xs lg:max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search skills, neighbors, or requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-100/80 hover:bg-slate-100 text-slate-900 placeholder:text-slate-400 pl-9 pr-4 py-2 rounded-xl text-xs border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all" />
          </form>
        )}

        {currentUser ? (
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return <Link key={link.path} to={link.path} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${isActive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}><Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} /><span>{link.label}</span>{link.highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}</Link>;
            })}
          </nav>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">Log in</Link>
            <Link to="/signup" className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all">Join Community</Link>
          </div>
        )}

        {currentUser && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50"><span className="text-xs font-bold text-slate-900">Notifications</span>{unreadCount > 0 && <button onClick={markAllAsRead} className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Mark all read</button>}</div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? <div className="p-6 text-center text-xs text-slate-400">No notifications yet</div> : notifications.map((n) => <div key={n.id} onClick={() => { markAsRead(n.id); if (n.link) { navigate(n.link); setShowNotifications(false); } }} className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-emerald-50/40' : ''}`}><div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-slate-900">{n.title}</span>{!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />}</div><p className="text-xs text-slate-600 mt-0.5">{n.message}</p><span className="text-[10px] text-slate-400 mt-1 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>)}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }} className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors">
                <img src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={currentUser.full_name} className="w-8 h-8 rounded-full object-cover border border-emerald-300" />
                <div className="hidden lg:block text-left text-xs leading-tight pr-1"><p className="font-semibold text-slate-900 truncate max-w-[100px]">{currentUser.full_name}</p><p className="text-[10px] text-emerald-700 font-bold">★ {Math.round(currentUser.trust_score)} Trust</p></div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 overflow-hidden z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100"><p className="text-xs font-bold text-slate-900">{currentUser.full_name}</p><p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p><div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md"><ShieldCheck className="w-3.5 h-3.5" /> Trust Score: {Math.round(currentUser.trust_score)}/100</div></div>
                  <div className="py-1">
                    <Link to={`/profile/${currentUser.id}`} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"><UserIcon className="w-4 h-4 text-slate-400" /> My Profile</Link>
                    <Link to="/monetization" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 font-semibold"><Coins className="w-4 h-4 text-emerald-600" /> Monetization Hub</Link>
                    <Link to="/trust" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"><ShieldCheck className="w-4 h-4 text-slate-400" /> Trust & Reputation</Link>
                    <Link to="/connections" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"><ArrowLeftRight className="w-4 h-4 text-slate-400" /> My Connections</Link>
                    <Link to="/community" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"><Compass className="w-4 h-4 text-slate-400" /> Neighborhood Dashboard</Link>
                    {currentUser.is_admin && <Link to="/admin" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 font-medium border-t border-slate-100"><Shield className="w-4 h-4 text-amber-600" /> Admin Moderation</Link>}
                  </div>
                  <div className="border-t border-slate-100 pt-1"><button onClick={async () => { setShowProfileMenu(false); await logout(); navigate('/'); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"><LogOut className="w-4 h-4" /> Log out</button></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
