import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ChevronDown, UserRound, Compass, ArrowLeftRight, Bell, Users, GraduationCap, Coins, ShieldCheck, LifeBuoy, Settings, Activity } from 'lucide-react';

export const productNavigationGroups = [
  { label: 'Profile & Learning', icon: UserRound, items: [['Edit Profile','/profile/edit-profile'],['Public Profile','/profile/public-profile'],['Skills Management','/profile/skills'],['Add New Skill','/profile/add-skill'],['Learning Goals','/learning/learning-goals'],['Teaching Skills','/learning/teaching-skills']] },
  { label: 'Discover & Matching', icon: Compass, items: [['Skill Search','/discover/search'],['Advanced Search & Filters','/discover/advanced-search'],['Recommended Users','/discover/recommended'],['AI Skill Matching','/matches/ai-matching'],['Match Details','/matches/match-details']] },
  { label: 'Requests & Exchanges', icon: ArrowLeftRight, items: [['Send Skill Request','/requests/send-request'],['Incoming Requests','/requests/incoming-requests'],['Sent Requests','/requests/sent-requests'],['Request Details','/requests/request-details'],['Active Skill Exchange','/exchanges/active-exchange'],['Exchange History','/exchanges/exchange-history'],['Exchange Rating','/exchanges/exchange-rating'],['Schedule Exchange','/exchanges/schedule'],['Calendar','/exchanges/calendar']] },
  { label: 'Communication', icon: Bell, items: [['Notifications','/notifications/notifications'],['Notification Settings','/notifications/notification-settings'],['Chat Details','/messages/chat-details']] },
  { label: 'Community', icon: Users, items: [['Create Community Post','/community/create-post'],['Post Details','/community/post-details'],['Community Groups','/community/groups'],['Group Details','/community/group-details']] },
  { label: 'Workshops & Credits', icon: GraduationCap, items: [['Workshops','/workshops/workshops'],['Create Workshop','/workshops/create-workshop'],['Workshop Details','/workshops/workshop-details'],['My Workshops','/workshops/my-workshops'],['Skill Credits','/learning/credits']] },
  { label: 'Membership & Trust', icon: Coins, items: [['Premium Membership','/membership/premium'],['Verification Center','/trust/verification']] },
  { label: 'Support & Settings', icon: LifeBuoy, items: [['Help & Support','/support/support'],['FAQ','/support/faq'],['Privacy & Security','/settings/privacy'],['Account Settings','/settings/account-settings'],['Activity History','/activity/activity']] },
] as const;

export const ProductNavigation: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = productNavigationGroups.some(group => group.items.some(([, path]) => location.pathname === path));

  return (
    <div className="relative hidden md:block">
      <button type="button" onClick={() => setOpen(v => !v)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} aria-expanded={open}>
        <LayoutGrid className="w-4 h-4" /> More
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-[760px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <div><p className="text-sm font-bold text-slate-900">SkillBarter Workspace</p><p className="text-[11px] text-slate-500">All integrated product screens</p></div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">40 screens</span>
            </div>
            <div className="grid max-h-[70vh] grid-cols-2 gap-4 overflow-y-auto pr-1 lg:grid-cols-3">
              {productNavigationGroups.map(group => { const GroupIcon = group.icon; return <div key={group.label}><div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><GroupIcon className="h-3.5 w-3.5" />{group.label}</div><div className="space-y-0.5">{group.items.map(([label,path]) => <Link key={path} to={path} onClick={() => setOpen(false)} className={`block rounded-lg px-2.5 py-1.5 text-xs transition-colors ${location.pathname === path ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{label}</Link>)}</div></div>; })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const ProductNavigationMobile: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = productNavigationGroups.some(group => group.items.some(([, path]) => location.pathname === path));
  return (
    <div className="relative flex-1">
      <button type="button" onClick={() => setOpen(v => !v)} className={`flex w-full flex-col items-center rounded-lg py-1 px-1 text-[10px] font-medium ${active ? 'text-emerald-700 font-bold' : 'text-slate-500'}`} aria-expanded={open}>
        <LayoutGrid className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-slate-500'}`} /><span className="mt-0.5">More</span>
      </button>
      {open && <div className="fixed bottom-[62px] left-2 right-2 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-900">SkillBarter Workspace</span><button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-400">Close</button></div>{productNavigationGroups.map(group => <div key={group.label} className="mb-3"><p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{group.label}</p><div className="grid grid-cols-2 gap-1">{group.items.map(([label,path]) => <Link key={path} to={path} onClick={() => setOpen(false)} className={`rounded-lg px-2 py-2 text-[11px] ${location.pathname === path ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</Link>)}</div></div>)}</div>}
    </div>
  );
};
