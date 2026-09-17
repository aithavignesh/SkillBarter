import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ProductNavigation } from './ProductNavigation';
import {
  Repeat, Compass, Sparkles, ArrowLeftRight, MessageSquare, Bell, Search,
  User as UserIcon, ShieldCheck, LogOut, Shield, Coins, Users, Settings,
  HelpCircle, ChevronRight,
} from 'lucide-react';

export const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160';

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
    const query = searchQuery.trim();
    if (query) navigate(`/discover?q=${encodeURIComponent(query)}`);
  };

  const primary = [
    { label: 'Overview', path: '/feed', icon: Repeat },
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Skill Matches', path: '/matches', icon: Sparkles },
    { label: 'Exchanges', path: '/exchanges', icon: ArrowLeftRight },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  const community = [
    { label: 'My Profile', path: `/profile/${currentUser?.id}`, icon: UserIcon },
    { label: 'Connections', path: '/connections', icon: Users },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'Trust & Reputation', path: '/trust', icon: ShieldCheck },
    { label: 'Monetization', path: '/monetization', icon: Coins },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  if (!currentUser) {
    return (
      <header className="sticky top-0 z-40 border-b border-[#e4e6e9] bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-[#d31d24] text-white">
              <Repeat className="h-[17px] w-[17px]" />
            </span>
            <span className="text-[19px] font-bold tracking-[-0.03em] text-[#17233b]">
              Skill<span className="text-[#d31d24]">Barter</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link to="/login" className="px-3 py-2 text-[13px] font-semibold text-[#4d5b72] hover:text-[#17233b]">Log in</Link>
            <Link to="/signup" className="bg-[#d31d24] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#b8171d]">Join SkillBarter</Link>
          </div>
        </div>
      </header>
    );
  }

  const navLink = (item: { label: string; path: string; icon: React.ComponentType<{ className?: string }> }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] transition-colors ${
          active
            ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]'
            : 'border-transparent text-[#596579] hover:bg-[#fafbfc] hover:text-[#17233b]'
        }`}
      >
        <Icon className={`h-[17px] w-[17px] ${active ? 'text-[#d31d24]' : 'text-[#8a93a1]'}`} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[312px] flex-col border-r border-[#e4e6e9] bg-white lg:flex">
        <div className="flex h-[82px] shrink-0 items-center border-b border-[#edf0f2] px-7">
          <Link to="/feed" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-[#d31d24] text-white"><Repeat className="h-[18px] w-[18px]" /></span>
            <div>
              <div className="text-[20px] font-bold tracking-[-0.035em] text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9299a5]">Skill exchange network</div>
            </div>
          </Link>
        </div>

        <div className="border-b border-[#edf0f2] px-5 py-4">
          <Link to={`/profile/${currentUser.id}`} className="group flex items-center gap-3 py-1">
            <img src={currentUser.avatar_url || DEFAULT_AVATAR_URL} alt={currentUser.full_name} className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#17233b]">{currentUser.full_name}</p>
              <p className="mt-0.5 text-[10px] text-[#8a92a0]">View your profile</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#b1b7c0] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-5">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1ac]">Workspace</p>
          <div className="space-y-0.5">{primary.map(navLink)}</div>
          <div className="my-6 border-t border-[#edf0f2]" />
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1ac]">Community</p>
          <div className="space-y-0.5">{community.map(navLink)}</div>
          <div className="mt-5 flex items-center border-l-2 border-transparent px-3 py-2"><ProductNavigation /></div>
          <div className="my-6 border-t border-[#edf0f2]" />
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1ac]">Support</p>
          <div className="space-y-0.5">
            <Link to="/support/support" className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] ${isActive('/support') ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#596579] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}>
              <HelpCircle className="h-[17px] w-[17px]" />Help & Support
            </Link>
            <Link to="/settings/account-settings" className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] ${isActive('/settings') ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#596579] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}>
              <Settings className="h-[17px] w-[17px]" />Settings
            </Link>
          </div>
        </nav>

        <div className="border-t border-[#edf0f2] px-5 py-4">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium text-[#8a92a0]">Trust score</span>
            <span className="font-bold text-[#17233b]">{Math.round(currentUser.trust_score)}/100</span>
          </div>
          <div className="mt-2 h-1 bg-[#eceef1]">
            <div className="h-full bg-[#d31d24]" style={{ width: `${Math.min(100, Math.max(0, currentUser.trust_score))}%` }} />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 h-[68px] border-b border-[#e4e6e9] bg-white lg:ml-[312px]">
        <div className="flex h-full items-center gap-4 px-5 sm:px-7 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-2 text-[11px] text-[#8a92a0] md:flex">
              <span>SkillBarter</span><span>/</span>
              <span className="font-semibold text-[#17233b]">{primary.find((x) => isActive(x.path))?.label || 'Community'}</span>
            </div>
            <form onSubmit={handleSearchSubmit} className="relative mt-0.5 max-w-[520px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9299a5]" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search people, skills or exchanges" className="h-9 w-full border border-[#e2e5e9] bg-[#fafbfc] pl-9 pr-4 text-[12px] text-[#17233b] outline-none transition focus:border-[#c8cdd5] focus:bg-white focus:ring-0" />
            </form>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button type="button" aria-label="Notifications" onClick={() => { setShowNotifications((v) => !v); setShowProfileMenu(false); }} className="relative flex h-9 w-9 items-center justify-center text-[#6f7887] hover:bg-[#f6f7f8] hover:text-[#17233b]">
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 bg-[#d31d24]" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 border border-[#e1e4e8] bg-white shadow-[0_12px_32px_rgba(23,35,59,.12)]">
                  <div className="flex items-center justify-between border-b border-[#edf0f2] px-4 py-3">
                    <span className="text-[12px] font-bold text-[#17233b]">Notifications</span>
                    {unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="text-[10px] font-semibold text-[#d31d24]">Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-[12px] text-[#8a92a0]">No notifications yet</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} onClick={() => { markAsRead(n.id); if (n.link) { navigate(n.link); setShowNotifications(false); } }} className={`cursor-pointer border-b border-[#f0f1f3] px-4 py-3 hover:bg-[#fafbfc] ${!n.is_read ? 'bg-[#fff8f8]' : ''}`}>
                          <div className="flex items-start justify-between gap-2"><span className="text-[12px] font-semibold text-[#17233b]">{n.title}</span>{!n.is_read && <span className="mt-1 h-1.5 w-1.5 bg-[#d31d24]" />}</div>
                          <p className="mt-1 text-[11px] leading-5 text-[#697386]">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button type="button" onClick={() => { setShowProfileMenu((v) => !v); setShowNotifications(false); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f6f7f8]">
                <img src={currentUser.avatar_url || DEFAULT_AVATAR_URL} alt={currentUser.full_name} className="h-8 w-8 rounded-full object-cover" />
                <span className="hidden max-w-[120px] truncate text-[12px] font-semibold text-[#17233b] xl:block">{currentUser.full_name}</span>
                <ChevronRight className="hidden h-3.5 w-3.5 rotate-90 text-[#9aa1ac] xl:block" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 border border-[#e1e4e8] bg-white shadow-[0_12px_32px_rgba(23,35,59,.12)]">
                  <div className="border-b border-[#edf0f2] px-4 py-3">
                    <p className="text-[12px] font-bold text-[#17233b]">{currentUser.full_name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#8a92a0]">{currentUser.email}</p>
                  </div>
                  <div className="py-1">
                    <Link to={`/profile/${currentUser.id}`} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-[#4d5b72] hover:bg-[#fafbfc]"><UserIcon className="h-4 w-4" />My Profile</Link>
                    <Link to="/monetization" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-[#d31d24] hover:bg-[#fff7f7]"><Coins className="h-4 w-4" />Monetization Hub</Link>
                    {currentUser.is_admin && <Link to="/admin" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 border-t border-[#edf0f2] px-4 py-2.5 text-[12px] text-[#8a5a00]"><Shield className="h-4 w-4" />Admin Moderation</Link>}
                  </div>
                  <div className="border-t border-[#edf0f2] p-1">
                    <button type="button" onClick={async () => { setShowProfileMenu(false); await logout(); navigate('/'); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-[#d31d24] hover:bg-[#fff7f7]"><LogOut className="h-4 w-4" />Log out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
