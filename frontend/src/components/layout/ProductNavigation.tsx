import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ChevronDown, UserRound, Compass, ArrowLeftRight, Bell, Users, GraduationCap, Coins, LifeBuoy } from 'lucide-react';

export const productNavigationGroups = [
  { label: 'Profile & Learning', icon: UserRound, items: [['Edit Profile','/profile/edit-profile'],['Public Profile','/profile/public-profile'],['Skills Management','/profile/skills'],['Add New Skill','/profile/add-skill'],['Learning Goals','/learning/learning-goals'],['Teaching Skills','/learning/teaching-skills']] },
  { label: 'Discover & Matching', icon: Compass, items: [['Skill Search','/discover/search'],['Advanced Search & Filters','/discover/advanced-search'],['Recommended Users','/discover/recommended'],['AI Skill Matching','/matches/ai-matching'],['Match Details','/matches/match-details']] },
  { label: 'Requests & Exchanges', icon: ArrowLeftRight, items: [['Send Skill Request','/requests/send-request'],['Incoming Requests','/requests/incoming-requests'],['Sent Requests','/requests/sent-requests'],['Request Details','/requests/request-details'],['Active Skill Exchange','/exchanges/active-exchange'],['Exchange History','/exchanges/exchange-history'],['Exchange Rating','/exchanges/exchange-rating'],['Schedule Exchange','/exchanges/schedule'],['Calendar','/exchanges/calendar']] },
  { label: 'Communication', icon: Bell, items: [['Notifications','/notifications/notifications'],['Notification Settings','/notifications/notification-settings'],['Chat Details','/messages/chat-details']] },
  { label: 'Community', icon: Users, items: [['Create Community Post','/community/create-post'],['Post Details','/community/post-details'],['Community Groups','/community/groups'],['Group Details','/community/group-details']] },
  { label: 'Workshops & Credits', icon: GraduationCap, items: [['Workshops','/workshops/workshops'],['Create Workshop','/workshops/create-workshop'],['Workshop Details','/workshops/workshop-details'],['My Workshops','/workshops/my-workshops'],['Skill Credits','/learning/credits']] },
  { label: 'Membership & Trust', icon: Coins, items: [['Premium Membership','/membership/premium'],['Verification Center','/trust/verification']] },
  { label: 'Support', icon: LifeBuoy, items: [['Help & Support','/support/support'],['FAQ','/support/faq'],['Privacy & Security','/settings/privacy'],['Account Settings','/settings/account-settings'],['Activity History','/activity/activity']] },
] as const;

export const ProductNavigation: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = productNavigationGroups.some(group => group.items.some(([, path]) => location.pathname === path));

  return (
    <div className="relative hidden md:block w-full">
      <button type="button" onClick={() => setOpen(v => !v)} className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] font-semibold transition-colors ${active ? 'text-[#d31d24]' : 'text-[#697386] hover:bg-[#fafbfc] hover:text-[#17233b]'}`} aria-expanded={open}>
        <LayoutGrid className="h-4 w-4" />
        <span>All features</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button aria-label="Close feature menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute left-full top-0 z-50 ml-3 w-[700px] max-w-[calc(100vw-2rem)] border border-[#e1e4e8] bg-white p-5 shadow-[0_16px_42px_rgba(23,35,59,.12)]">
            <div className="mb-4 flex items-end justify-between border-b border-[#edf0f2] pb-3">
              <div><p className="text-[13px] font-bold text-[#17233b]">All SkillBarter features</p><p className="mt-0.5 text-[10px] text-[#8a92a0]">Secondary screens stay here so the main navigation stays focused.</p></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#d31d24]">Product library</span>
            </div>
            <div className="grid max-h-[70vh] grid-cols-2 gap-x-8 gap-y-5 overflow-y-auto pr-1 lg:grid-cols-3">
              {productNavigationGroups.map(group => { const GroupIcon = group.icon; return <section key={group.label}><div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9aa1ac]"><GroupIcon className="h-3.5 w-3.5" />{group.label}</div><div className="space-y-0.5">{group.items.map(([label,path]) => <Link key={path} to={path} onClick={() => setOpen(false)} className={`block border-l-2 px-2.5 py-1.5 text-[11px] transition-colors ${location.pathname === path ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#66738a] hover:border-[#e3e5e8] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}>{label}</Link>)}</div></section>; })}
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
      <button type="button" onClick={() => setOpen(v => !v)} className={`flex w-full flex-col items-center py-1 px-1 text-[10px] font-medium ${active ? 'text-[#d31d24] font-bold' : 'text-[#7b8492]'}`} aria-expanded={open}>
        <LayoutGrid className={`h-5 w-5 ${active ? 'text-[#d31d24]' : 'text-[#7b8492]'}`} /><span className="mt-0.5">More</span>
      </button>
      {open && <div className="fixed bottom-[62px] left-2 right-2 z-50 max-h-[70vh] overflow-y-auto border border-[#e1e4e8] bg-white p-3 shadow-[0_14px_36px_rgba(23,35,59,.14)]"><div className="mb-3 flex items-center justify-between border-b border-[#edf0f2] pb-2"><span className="text-xs font-bold text-[#17233b]">All features</span><button type="button" onClick={() => setOpen(false)} className="text-[10px] font-semibold text-[#d31d24]">Close</button></div>{productNavigationGroups.map(group => <div key={group.label} className="mb-4"><p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-wide text-[#9aa1ac]">{group.label}</p><div className="grid grid-cols-2 gap-1">{group.items.map(([label,path]) => <Link key={path} to={path} onClick={() => setOpen(false)} className={`border-l-2 px-2 py-2 text-[11px] ${location.pathname === path ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#66738a] hover:bg-[#fafbfc]'}`}>{label}</Link>)}</div></div>)}</div>}
    </div>
  );
};
