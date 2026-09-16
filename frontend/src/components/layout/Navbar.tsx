import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { productNavigationGroups } from './ProductNavigation';
import { Repeat, Compass, Sparkles, ArrowLeftRight, MessageSquare, Bell, Search, User as UserIcon, ShieldCheck, LogOut, Shield, Coins, Users, Settings, HelpCircle, ChevronRight } from 'lucide-react';

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
    { label: 'Overview', path: '/feed', icon: Repeat },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Skill Matches', path: '/matches', icon: Sparkles },
    { label: 'Exchanges', path: '/exchanges', icon: ArrowLeftRight },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
  ];
  const workspaceLinks = [
    { label: 'My Profile', path: `/profile/${currentUser?.id}`, icon: UserIcon },
    { label: 'Connections', path: '/connections', icon: Users },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'Trust & Reputation', path: '/trust', icon: ShieldCheck },
    { label: 'Monetization', path: '/monetization', icon: Coins },
  ];
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  if (!currentUser) return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d31d24] text-white shadow-[0_8px_20px_rgba(211,29,36,.20)]"><Repeat className="h-5 w-5" /></div>
          <div><span className="text-xl font-extrabold tracking-tight text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></span><span className="hidden sm:block text-[10px] font-medium uppercase tracking-wider text-[#7b8799]">Zero-Cash Community</span></div>
        </Link>
        <div className="flex items-center gap-2"><Link to="/login" className="rounded-lg px-3 py-2 text-xs font-semibold text-[#4d5b72] hover:bg-[#f2f4f7]">Log in</Link><Link to="/signup" className="rounded-xl bg-[#d31d24] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#b8171d]">Join Community</Link></div>
      </div>
    </header>
  );

  return <>
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[312px] flex-col border-r border-[#e1e5ea] bg-white">
      <div className="flex h-[104px] shrink-0 items-center border-b border-[#edf0f3] px-8">
        <Link to="/feed" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d31d24] text-white shadow-[0_8px_20px_rgba(211,29,36,.18)]"><Repeat className="h-6 w-6" /></div>
          <div><div className="text-[22px] font-extrabold tracking-tight text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></div><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#8b95a5]">Community workspace</div></div>
        </Link>
      </div>
      <div className="shrink-0 border-b border-[#edf0f3] p-4">
        <Link to={`/profile/${currentUser.id}`} className="flex items-center gap-3 rounded-xl border border-[#e1e5ea] bg-[#fafbfc] p-3 hover:border-[#f2b9bb] hover:bg-[#fff8f8]">
          <img src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={currentUser.full_name} className="h-9 w-9 rounded-lg object-cover border border-[#f2b9bb]" />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#17233b]">{currentUser.full_name}</p><p className="text-[10px] text-[#7b8799]">Workspace member</p></div><ChevronRight className="h-4 w-4 text-[#9aa4b2]" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa4b2]">Workspace</p>
        <div className="space-y-1">
          {navLinks.map(({ label, path, icon: Icon }) => { const active = isActive(path); return <Link key={path} to={path} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${active ? 'bg-[#fff1f1] text-[#d31d24] shadow-[inset_3px_0_0_#d31d24]' : 'text-[#66738a] hover:bg-[#f6f7f9] hover:text-[#17233b]'}`}><Icon className={`h-[17px] w-[17px] ${active ? 'text-[#d31d24]' : 'text-[#7b8799]'}`} />{label}{label === 'Skill Matches' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d31d24]" />}</Link>; })}
        </div>

        <div className="my-6 border-t border-[#edf0f3]" />
        <div className="flex items-center justify-between px-3 pb-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa4b2]">All Product Screens</p><span className="rounded-full bg-[#fff1f1] px-2 py-0.5 text-[9px] font-extrabold text-[#d31d24]">40</span></div>
        <p className="px-3 pb-3 text-[10px] leading-4 text-[#9aa4b2]">All 40 screens are directly available below. No hidden More menu.</p>
        <div className="space-y-4">
          {productNavigationGroups.map(group => { const GroupIcon = group.icon; return <section key={group.label}><div className="mb-1.5 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8b95a5]"><GroupIcon className="h-3.5 w-3.5" />{group.label}</div><div className="space-y-0.5">{group.items.map(([label, path]) => { const active = location.pathname === path; return <Link key={path} to={path} className={`block rounded-lg px-3 py-2 text-[11px] font-medium transition-all ${active ? 'bg-[#fff1f1] font-bold text-[#d31d24]' : 'text-[#66738a] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}>{label}</Link>; })}</div></section>; })}
        </div>

        <p className="mt-7 px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa4b2]">Community</p>
        <div className="space-y-1">{workspaceLinks.map(({ label, path, icon: Icon }) => { const active = location.pathname === path || (path !== `/profile/${currentUser.id}` && location.pathname.startsWith(path + '/')); return <Link key={path} to={path} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${active ? 'bg-[#fff1f1] text-[#d31d24] shadow-[inset_3px_0_0_#d31d24]' : 'text-[#66738a] hover:bg-[#f6f7f9] hover:text-[#17233b]'}`}><Icon className={`h-[17px] w-[17px] ${active ? 'text-[#d31d24]' : 'text-[#7b8799]'}`} />{label}</Link>; })}</div>
        <p className="mt-7 px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa4b2]">Support</p>
        <Link to="/support/support" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${isActive('/support') ? 'bg-[#fff1f1] text-[#d31d24]' : 'text-[#66738a] hover:bg-[#f6f7f9] hover:text-[#17233b]'}`}><HelpCircle className="h-[17px] w-[17px]" />Help & Support</Link>
        <Link to="/settings/account-settings" className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${isActive('/settings') ? 'bg-[#fff1f1] text-[#d31d24]' : 'text-[#66738a] hover:bg-[#f6f7f9] hover:text-[#17233b]'}`}><Settings className="h-[17px] w-[17px]" />Settings</Link>
      </nav>
      <div className="shrink-0 border-t border-[#edf0f3] bg-white p-4"><div className="rounded-xl bg-[#fff8f8] px-3 py-2.5"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-[#7b8799]">Trust score</span><span className="text-xs font-extrabold text-[#d31d24]">{Math.round(currentUser.trust_score)}/100</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f3dfe0]"><div className="h-full rounded-full bg-[#d31d24]" style={{width:`${Math.min(100, Math.max(0, currentUser.trust_score))}%`}} /></div></div></div>
    </aside>

    <header className="sticky top-0 z-30 h-[72px] border-b border-[#e1e5ea] bg-white/95 backdrop-blur-md lg:ml-[312px]">
      <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1"><div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-[#7b8799]"><span className="rounded-full bg-[#fff1f1] px-3 py-1 font-bold text-[#d31d24]">Workspace</span><span>/</span><span className="text-[#17233b]">{navLinks.find(x => location.pathname === x.path)?.label || 'Messages'}</span></div><form onSubmit={handleSearchSubmit} className="relative mt-0 sm:mt-1 max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b95a5]" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search skills, neighbors, or requests..." className="h-9 w-full rounded-lg border border-[#e1e5ea] bg-[#f8fafc] pl-9 pr-4 text-xs text-[#17233b] outline-none transition focus:border-[#d31d24] focus:bg-white focus:ring-2 focus:ring-[#d31d24]/10" /></form></div>
        <div className="flex items-center gap-2">
          <div className="relative"><button onClick={() => {setShowNotifications(v=>!v);setShowProfileMenu(false);}} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e1e5ea] bg-white text-[#66738a] shadow-sm hover:border-[#d5dbe2] hover:text-[#17233b]"><Bell className="h-[18px] w-[18px]" />{unreadCount>0&&<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#d31d24]" />}</button>{showNotifications&&<div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-[#e1e5ea] bg-white shadow-[0_18px_45px_rgba(23,35,59,.14)]"><div className="flex items-center justify-between border-b border-[#edf0f3] px-4 py-3"><span className="text-xs font-bold text-[#17233b]">Notifications</span>{unreadCount>0&&<button onClick={markAllAsRead} className="text-[10px] font-semibold text-[#d31d24]">Mark all read</button>}</div><div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-6 text-center text-xs text-[#8b95a5]">No notifications yet</div>:notifications.map(n=><div key={n.id} onClick={()=>{markAsRead(n.id);if(n.link){navigate(n.link);setShowNotifications(false);}}} className={`cursor-pointer border-b border-[#edf0f3] px-4 py-3 hover:bg-[#fafbfc] ${!n.is_read?'bg-[#fff8f8]':''}`}><div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-[#17233b]">{n.title}</span>{!n.is_read&&<span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#d31d24]"/>}</div><p className="mt-0.5 text-xs text-[#66738a]">{n.message}</p></div>)}</div></div>}</div>
          <div className="relative"><button onClick={()=>{setShowProfileMenu(v=>!v);setShowNotifications(false);}} className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 hover:border-[#e1e5ea] hover:bg-[#fafbfc]"><img src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={currentUser.full_name} className="h-9 w-9 rounded-lg object-cover"/><div className="hidden md:block text-left"><p className="max-w-[130px] truncate text-xs font-bold text-[#17233b]">{currentUser.full_name}</p><p className="text-[10px] font-semibold text-[#d31d24]">★ {Math.round(currentUser.trust_score)} Trust</p></div></button>{showProfileMenu&&<div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e1e5ea] bg-white shadow-[0_18px_45px_rgba(23,35,59,.14)]"><div className="border-b border-[#edf0f3] px-4 py-3"><p className="text-xs font-bold text-[#17233b]">{currentUser.full_name}</p><p className="truncate text-[11px] text-[#7b8799]">{currentUser.email}</p></div><div className="py-1"><Link to={`/profile/${currentUser.id}`} onClick={()=>setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-[#4d5b72] hover:bg-[#f6f7f9]"><UserIcon className="h-4 w-4"/>My Profile</Link><Link to="/monetization" onClick={()=>setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#d31d24] hover:bg-[#fff1f1]"><Coins className="h-4 w-4"/>Monetization Hub</Link>{currentUser.is_admin&&<Link to="/admin" onClick={()=>setShowProfileMenu(false)} className="flex items-center gap-2 border-t border-[#edf0f3] px-4 py-2 text-xs text-[#a16207]"><Shield className="h-4 w-4"/>Admin Moderation</Link>}</div><div className="border-t border-[#edf0f3] p-1"><button onClick={async()=>{setShowProfileMenu(false);await logout();navigate('/');}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#d31d24] hover:bg-[#fff1f1]"><LogOut className="h-4 w-4"/>Log out</button></div></div>}</div>
        </div>
      </div>
    </header>
  </>;
};
