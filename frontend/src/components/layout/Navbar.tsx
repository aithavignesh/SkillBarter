import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Repeat, Compass, Sparkles, ArrowLeftRight, MessageSquare, Bell, Search,
  User as UserIcon, ShieldCheck, LogOut, Shield, Coins, Users, Settings,
  HelpCircle, ChevronRight, ChevronDown, GraduationCap, LifeBuoy, Sun, Moon, Menu, X,
} from 'lucide-react';

export const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160';

type NavFeature = { label: string; path: string };
type NavItem = { label: string; path: string; icon: React.ComponentType<{ className?: string }>; features?: NavFeature[] };

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) navigate(`/discover?q=${encodeURIComponent(query)}`);
  };

  const primary: NavItem[] = [
    { label: 'Home', path: '/feed', icon: Repeat },
    {
      label: 'Find a Learning Partner', path: '/discover', icon: Compass,
      features: [
        { label: 'Search Skills & People', path: '/discover/search' },
        { label: 'Filter Learning Partners', path: '/discover/advanced-search' },
        { label: 'Recommended Partners', path: '/discover/recommended' },
      ],
    },
    {
      label: 'My Learning Matches', path: '/matches', icon: Sparkles,
      features: [
        { label: 'Smart Learning Matches', path: '/matches/ai-matching' },
        { label: 'Match Details', path: '/matches/match-details' },
      ],
    },
    {
      label: 'Learning Exchanges', path: '/exchanges', icon: ArrowLeftRight,
      features: [
        { label: 'Start Learning Request', path: '/requests/send-request' },
        { label: 'Incoming Learning Requests', path: '/requests/incoming-requests' },
        { label: 'Sent Exchange Requests', path: '/requests/sent-requests' },
        { label: 'Request Details', path: '/requests/request-details' },
        { label: 'Active Learning Session', path: '/exchanges/active-exchange' },
        { label: 'Learning History', path: '/exchanges/exchange-history' },
        { label: 'Peer Reviews', path: '/exchanges/exchange-rating' },
        { label: 'Schedule Learning Session', path: '/exchanges/schedule' },
        { label: 'Calendar', path: '/exchanges/calendar' },
      ],
    },
    {
      label: 'Messages', path: '/messages', icon: MessageSquare,
      features: [
        { label: 'Chat Details', path: '/messages/chat-details' },
        { label: 'Notifications', path: '/notifications' },
        { label: 'Notification Settings', path: '/notifications/notification-settings' },
      ],
    },
  ];

  const community: NavItem[] = [
    {
      label: 'My Profile', path: `/profile/${currentUser?.id}`, icon: UserIcon,
      features: [
        { label: 'Edit Profile', path: '/profile/edit-profile' },
        { label: 'Public Profile', path: '/profile/public-profile' },
        { label: 'Skills Management', path: '/profile/skills' },
        { label: 'Add New Skill', path: '/profile/add-skill' },
        { label: 'What I Want to Learn', path: '/learning/learning-goals' },
        { label: 'What I Can Teach', path: '/learning/teaching-skills' },
      ],
    },
    { label: 'Learning Network', path: '/connections', icon: Users },
    { label: 'Invite Peers', path: '/invite', icon: Users },
    { label: 'Beta Feedback', path: '/feedback', icon: MessageSquare },
    {
      label: 'Student Community', path: '/community', icon: Users,
      features: [
        { label: 'Share Learning Update', path: '/community/create-post' },
        { label: 'Post Details', path: '/community/post-details' },
        { label: 'Community Groups', path: '/community/groups' },
        { label: 'Group Details', path: '/community/group-details' },
        { label: 'Learning Sessions', path: '/workshops/workshops' },
        { label: 'Create Learning Session', path: '/workshops/create-workshop' },
        { label: 'Workshop Details', path: '/workshops/workshop-details' },
        { label: 'My Workshops', path: '/workshops/my-workshops' },
        { label: 'Learning Progress', path: '/learning/credits' },
      ],
    },
    {
      label: 'Trust & Reputation', path: '/trust', icon: ShieldCheck,
      features: [{ label: 'Verification Center', path: '/trust/verification' }],
    },
    {
      label: 'Monetization', path: '/monetization', icon: Coins,
      features: [{ label: 'Premium Membership', path: '/membership/premium' }],
    },
  ];

  const support: NavItem[] = [
    { label: 'Help & Support', path: '/support/support', icon: HelpCircle, features: [{ label: 'FAQ', path: '/support/faq' }] },
    {
      label: 'Settings', path: '/settings/account-settings', icon: Settings,
      features: [
        { label: 'Privacy & Security', path: '/settings/privacy' },
        { label: 'Account Settings', path: '/settings/account-settings' },
        { label: 'Activity History', path: '/activity/activity' },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

if (!currentUser) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2"
                    aria-label="SkillBarter home"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c62828] text-white">
                        <Repeat className="h-5 w-5" />
                    </div>

                    <span className="text-lg font-semibold tracking-tight text-slate-900">
                        SkillBarter
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center gap-7 lg:flex">
                    <a
                        href="#how-it-works"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c62828]"
                    >
                        How it works
                    </a>

                    <a
                        href="#explore"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c62828]"
                    >
                        Explore
                    </a>

                    <a
                        href="#why-skillbarter"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c62828]"
                    >
                        Why SkillBarter
                    </a>

                    <a
                        href="#faq"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c62828]"
                    >
                        FAQ
                    </a>
                </div>

                {/* Desktop Actions */}
                <div className="hidden items-center gap-3 lg:flex">
                    {/* Theme Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </button>

                    {/* Login */}
                    <Link
                        to="/login"
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        Log in
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-2 lg:hidden">
                    {/* Theme Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
                        aria-label="Toggle navigation menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
                    <div className="flex flex-col gap-1">

                        <a
                            href="#how-it-works"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#c62828]"
                        >
                            How it works
                        </a>

                        <a
                            href="#explore"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#c62828]"
                        >
                            Explore
                        </a>

                        <a
                            href="#why-skillbarter"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#c62828]"
                        >
                            Why SkillBarter
                        </a>

                        <a
                            href="#faq"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#c62828]"
                        >
                            FAQ
                        </a>

                        <div className="my-2 border-t border-slate-200" />

                        <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
  const navLink = (item: NavItem) => {
    const active = isActive(item.path);
    const expanded = expandedNav === item.path || Boolean(item.features?.some(feature => isActive(feature.path)));
    const Icon = item.icon;
    return (
      <div key={item.path}>
        <div className={`flex items-center border-l-2 transition-colors ${active ? 'border-[#d31d24] bg-[#fff7f7]' : 'border-transparent'}`}>
          <Link to={item.path} className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[13px] ${active ? 'font-semibold text-[#d31d24]' : 'text-[#596579] hover:text-[#17233b]'}`}>
            <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? 'text-[#d31d24]' : 'text-[#8a93a1]'}`} />
            <span>{item.label}</span>
          </Link>
          {item.features && item.features.length > 0 && (
            <button type="button" onClick={() => setExpandedNav(expandedNav === item.path ? null : item.path)} className={`mr-1 flex h-8 w-8 items-center justify-center ${expanded ? 'text-[#d31d24]' : 'text-[#a0a6af] hover:text-[#17233b]'}`} aria-label={`Show ${item.label} features`} aria-expanded={expanded}>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {expanded && item.features && (
          <div className="ml-7 border-l border-[#edf0f2] pl-2 py-1">
            {item.features.map(feature => {
              const featureActive = isActive(feature.path);
              return (
                <Link key={feature.path} to={feature.path} className={`block border-l-2 px-3 py-1.5 text-[10px] transition-colors ${featureActive ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#66738a] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}>
                  {feature.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[312px] flex-col border-r border-[#e4e6e9] bg-white lg:flex">
        <div className="flex h-[82px] shrink-0 items-center border-b border-[#edf0f2] px-7">
          <Link to="/feed" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-[#d31d24] text-white"><Repeat className="h-[18px] w-[18px]" /></span>
            <div><div className="text-[20px] font-bold tracking-[-0.035em] text-[#17233b]">Skill<span className="text-[#d31d24]">Barter</span></div><div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9299a5]">Skill exchange network</div></div>
          </Link>
        </div>
        <div className="border-b border-[#edf0f2] px-5 py-4">
          <Link to={`/profile/${currentUser.id}`} className="group flex items-center gap-3 py-1">
            <img src={currentUser.avatar_url || DEFAULT_AVATAR_URL} alt={currentUser.full_name} className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#17233b]">{currentUser.full_name}</p><p className="mt-0.5 text-[10px] text-[#8a92a0]">View your profile</p></div>
            <ChevronRight className="h-4 w-4 text-[#b1b7c0] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-5 py-5">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1ac]">Workspace</p>
          <div className="space-y-0.5">{primary.map(navLink)}</div>
          <div className="my-6 border-t border-[#edf0f2]" />
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1ac]">Community</p>
          <div className="space-y-0.5">{community.map(navLink)}</div>
          <div className="my-6 border-t border-[#edf0f2]" />
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa1ac]">Support</p>
          <div className="space-y-0.5">{support.map(navLink)}</div>
        </nav>
        <div className="border-t border-[#edf0f2] px-5 py-4">
          <div className="flex items-center justify-between text-[10px]"><span className="font-medium text-[#8a92a0]">Trust score</span><span className="font-bold text-[#17233b]">{Math.round(currentUser.trust_score)}/100</span></div>
          <div className="mt-2 h-1 bg-[#eceef1]"><div className="h-full bg-[#d31d24]" style={{ width: `${Math.min(100, Math.max(0, currentUser.trust_score))}%` }} /></div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 h-[68px] border-b border-[#e4e6e9] bg-white lg:ml-[312px]">
        <div className="flex h-full items-center gap-4 px-5 sm:px-7 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-2 text-[11px] text-[#8a92a0] md:flex"><span>SkillBarter</span><span>/</span><span className="font-semibold text-[#17233b]">{primary.find((x) => isActive(x.path))?.label || 'Community'}</span></div>
            <form onSubmit={handleSearchSubmit} className="relative mt-0.5 max-w-[520px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9299a5]" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search learning skills or people" className="h-9 w-full border border-[#e2e5e9] bg-[#fafbfc] pl-9 pr-4 text-[12px] text-[#17233b] outline-none transition focus:border-[#c8cdd5] focus:bg-white focus:ring-0" /></form>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Dark mode' : 'Light mode'} className="flex h-9 items-center gap-2 border border-[#e1e4e8] bg-white px-3 text-[11px] font-semibold text-[#4d5b72] hover:border-[#cbd1d8] hover:text-[#17233b]">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <div className="relative">
              <button type="button" aria-label="Notifications" onClick={() => { setShowNotifications((v) => !v); setShowProfileMenu(false); }} className="relative flex h-9 w-9 items-center justify-center text-[#6f7887] hover:bg-[#f6f7f8] hover:text-[#17233b]"><Bell className="h-[18px] w-[18px]" />{unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 bg-[#d31d24]" />}</button>
              {showNotifications && <div className="absolute right-0 mt-2 w-80 border border-[#e1e4e8] bg-white shadow-[0_12px_32px_rgba(23,35,59,.12)]"><div className="flex items-center justify-between border-b border-[#edf0f2] px-4 py-3"><span className="text-[12px] font-bold text-[#17233b]">Notifications</span>{unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="text-[10px] font-semibold text-[#d31d24]">Mark all read</button>}</div><div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <div className="p-6 text-center text-[12px] text-[#8a92a0]">No notifications yet</div> : notifications.map((n) => <div key={n.id} onClick={() => { markAsRead(n.id); if (n.link) { navigate(n.link); setShowNotifications(false); } }} className={`cursor-pointer border-b border-[#f0f1f3] px-4 py-3 hover:bg-[#fafbfc] ${!n.is_read ? 'bg-[#fff8f8]' : ''}`}><div className="flex items-start justify-between gap-2"><span className="text-[12px] font-semibold text-[#17233b]">{n.title}</span>{!n.is_read && <span className="mt-1 h-1.5 w-1.5 bg-[#d31d24]" />}</div><p className="mt-1 text-[11px] leading-5 text-[#697386]">{n.message}</p></div>)}</div></div>}
            </div>
            <div className="relative">
              <button type="button" onClick={() => { setShowProfileMenu((v) => !v); setShowNotifications(false); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f6f7f8]"><img src={currentUser.avatar_url || DEFAULT_AVATAR_URL} alt={currentUser.full_name} className="h-8 w-8 rounded-full object-cover" /><span className="hidden max-w-[120px] truncate text-[12px] font-semibold text-[#17233b] xl:block">{currentUser.full_name}</span><ChevronRight className="hidden h-3.5 w-3.5 rotate-90 text-[#9aa1ac] xl:block" /></button>
              {showProfileMenu && <div className="absolute right-0 mt-2 w-60 border border-[#e1e4e8] bg-white shadow-[0_12px_32px_rgba(23,35,59,.12)]"><div className="border-b border-[#edf0f2] px-4 py-3"><p className="text-[12px] font-bold text-[#17233b]">{currentUser.full_name}</p><p className="mt-0.5 truncate text-[10px] text-[#8a92a0]">{currentUser.email}</p></div><div className="py-1"><button type="button" onClick={() => toggleTheme()} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] font-semibold text-[#4d5b72] hover:bg-[#fafbfc]"><span className="flex items-center gap-2">{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{theme === 'light' ? 'Dark mode' : 'Light mode'}</span><span className="text-[10px] text-[#9299a5]">{theme === 'light' ? 'OFF' : 'ON'}</span></button><Link to={`/profile/${currentUser.id}`} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-[#4d5b72] hover:bg-[#fafbfc]"><UserIcon className="h-4 w-4" />My Profile</Link><Link to="/monetization" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-[#d31d24] hover:bg-[#fff7f7]"><Coins className="h-4 w-4" />Monetization Hub</Link>{currentUser.is_admin && <Link to="/admin" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 border-t border-[#edf0f2] px-4 py-2.5 text-[12px] text-[#8a5a00]"><Shield className="h-4 w-4" />Admin Moderation</Link>}</div><div className="border-t border-[#edf0f2] p-1"><button type="button" onClick={async () => { setShowProfileMenu(false); await logout(); navigate('/'); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-[#d31d24] hover:bg-[#fff7f7]"><LogOut className="h-4 w-4" />Log out</button></div></div>}
            </div>
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobileMenu(v => !v)}
          aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
          className="fixed left-5 top-[15px] z-50 flex h-9 w-9 items-center justify-center border border-[#e1e4e8] bg-white text-[#17233b] shadow-sm"
        >
          {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {showMobileMenu && (
          <div className="fixed inset-x-0 top-[68px] z-40 max-h-[calc(100vh-68px)] overflow-y-auto border-b border-[#e1e4e8] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(23,35,59,.12)]">
            <div className="mb-4 flex items-center gap-3 border-b border-[#edf0f2] pb-4">
              <img src={currentUser.avatar_url || DEFAULT_AVATAR_URL} alt={currentUser.full_name} className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-[#17233b]">{currentUser.full_name}</p>
                <p className="truncate text-[10px] text-[#8a92a0]">{currentUser.email}</p>
              </div>
              <button type="button" onClick={toggleTheme} className="ml-auto flex items-center gap-2 border border-[#e1e4e8] px-3 py-2 text-[11px] font-semibold text-[#4d5b72]">
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>
            </div>
            {[...primary, ...community, ...support].map(item => {
              const active = isActive(item.path);
              const expanded = expandedNav === item.path || Boolean(item.features?.some(feature => isActive(feature.path)));
              const Icon = item.icon;
              return (
                <div key={item.path} className="border-b border-[#f0f1f3] last:border-b-0">
                  <div className="flex items-center">
                    <Link
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex min-w-0 flex-1 items-center gap-3 px-2 py-3 text-[13px] ${active ? 'font-semibold text-[#d31d24]' : 'text-[#4d5b72]'}`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-[#d31d24]' : 'text-[#8a93a1]'}`} />
                      {item.label}
                    </Link>
                    {item.features && (
                      <button
                        type="button"
                        onClick={() => setExpandedNav(expandedNav === item.path ? null : item.path)}
                        className="flex h-9 w-9 items-center justify-center text-[#8a92a0]"
                        aria-label={`Show ${item.label} features`}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  {expanded && item.features && (
                    <div className="ml-9 border-l border-[#edf0f2] pb-2 pl-2">
                      {item.features.map(feature => (
                        <Link
                          key={feature.path}
                          to={feature.path}
                          onClick={() => setShowMobileMenu(false)}
                          className={`block px-3 py-2 text-[11px] ${isActive(feature.path) ? 'font-semibold text-[#d31d24]' : 'text-[#66738a]'}`}
                        >
                          {feature.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};