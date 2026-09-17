import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ChevronDown, UserRound, Compass, ArrowLeftRight, Bell, Users, GraduationCap, Coins, LifeBuoy, Search, X } from 'lucide-react';

export const productNavigationGroups = [
  { label: 'Profile & Learning', icon: UserRound, items: [['Edit Profile','/profile/edit-profile'],['Public Profile','/profile/public-profile'],['Skills Management','/profile/skills'],['Add New Skill','/profile/add-skill'],['Learning Goals','/learning/learning-goals'],['Teaching Skills','/learning/teaching-skills']] },
  { label: 'Discover & Matching', icon: Compass, items: [['Skill Search','/discover/search'],['Advanced Search & Filters','/discover/advanced-search'],['Recommended Users','/discover/recommended'],['AI Skill Matching','/matches/ai-matching'],['Match Details','/matches/match-details']] },
  { label: 'Requests & Exchanges', icon: ArrowLeftRight, items: [['Send Skill Request','/requests/send-request'],['Incoming Requests','/requests/incoming-requests'],['Sent Requests','/requests/sent-requests'],['Request Details','/requests/request-details'],['Active Skill Exchange','/exchanges/active-exchange'],['Exchange History','/exchanges/exchange-history'],['Exchange Rating','/exchanges/exchange-rating'],['Schedule Exchange','/exchanges/schedule'],['Calendar','/exchanges/calendar']] },
  { label: 'Communication', icon: Bell, items: [['Notifications','/notifications'],['Notification Settings','/notifications/notification-settings'],['Chat Details','/messages/chat-details']] },
  { label: 'Community', icon: Users, items: [['Create Community Post','/community/create-post'],['Post Details','/community/post-details'],['Community Groups','/community/groups'],['Group Details','/community/group-details']] },
  { label: 'Workshops & Credits', icon: GraduationCap, items: [['Workshops','/workshops/workshops'],['Create Workshop','/workshops/create-workshop'],['Workshop Details','/workshops/workshop-details'],['My Workshops','/workshops/my-workshops'],['Skill Credits','/learning/credits']] },
  { label: 'Membership & Trust', icon: Coins, items: [['Premium Membership','/membership/premium'],['Verification Center','/trust/verification']] },
  { label: 'Support', icon: LifeBuoy, items: [['Help & Support','/support/support'],['FAQ','/support/faq'],['Privacy & Security','/settings/privacy'],['Account Settings','/settings/account-settings'],['Activity History','/activity/activity']] },
] as const;

const allFeatureCount = productNavigationGroups.reduce((total, group) => total + group.items.length, 0);

export const ProductNavigation: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const location = useLocation();

  const activeGroup = productNavigationGroups.find(group => group.items.some(([, path]) => location.pathname === path || location.pathname.startsWith(path + '/')));
  const active = Boolean(activeGroup);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return productNavigationGroups;
    return productNavigationGroups
      .map(group => ({ ...group, items: group.items.filter(([label]) => label.toLowerCase().includes(term) || group.label.toLowerCase().includes(term)) }))
      .filter(group => group.items.length > 0);
  }, [query]);

  const toggle = (label: string) => setExpandedGroup(current => current === label ? null : label);

  return (
    <div className="relative w-full">
      <button type="button" onClick={() => setOpen(v => !v)} className={`group flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold transition-colors ${open || active ? 'text-[#d31d24]' : 'text-[#697386] hover:bg-[#fafbfc] hover:text-[#17233b]'}`} aria-expanded={open} aria-controls="skillbarter-all-features">
        <LayoutGrid className="h-[17px] w-[17px]" />
        <span className="flex-1 text-left">All features</span>
        <span className={`text-[9px] font-medium ${open || active ? 'text-[#d31d24]' : 'text-[#a0a6af]'}`}>{allFeatureCount}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <button aria-label="Close all features" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div id="skillbarter-all-features" className="fixed left-5 bottom-20 z-50 w-[272px] max-w-[calc(100vw-2rem)] overflow-hidden border border-[#dfe3e7] bg-white shadow-[0_18px_45px_rgba(23,35,59,.16)]">
            <div className="border-b border-[#edf0f2] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[12px] font-bold text-[#17233b]">All features</p><p className="mt-0.5 text-[9px] text-[#8a92a0]">Explore every SkillBarter workspace.</p></div>
                <button type="button" onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center text-[#9aa1ac] hover:bg-[#f6f7f8] hover:text-[#17233b]" aria-label="Close"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="relative mt-3"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa1ac]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search features" className="h-8 w-full border border-[#e2e5e9] bg-[#fafbfc] pl-8 pr-3 text-[10px] text-[#17233b] outline-none focus:border-[#cbd0d6] focus:bg-white" /></div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto bg-[#fbfcfc] px-2 py-2">
              {filteredGroups.length === 0 ? <div className="px-4 py-8 text-center"><Search className="mx-auto h-5 w-5 text-[#c1c6cd]" /><p className="mt-2 text-[11px] font-semibold text-[#697386]">No features found</p><p className="mt-1 text-[9px] text-[#9aa1ac]">Try another search term.</p></div> : filteredGroups.map(group => {
                const GroupIcon = group.icon;
                const groupActive = group.items.some(([, path]) => location.pathname === path || location.pathname.startsWith(path + '/'));
                const expanded = expandedGroup === group.label || groupActive || Boolean(query.trim());
                return <section key={group.label} className="mb-1 last:mb-0">
                  <button type="button" onClick={() => toggle(group.label)} className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${groupActive ? 'bg-[#fff6f6] text-[#d31d24]' : 'bg-white text-[#536075] hover:bg-[#f6f7f8] hover:text-[#17233b]'}`} aria-expanded={expanded}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${groupActive ? 'bg-[#fff0f0] text-[#d31d24]' : 'bg-[#f1f3f5] text-[#697386]'}`}><GroupIcon className="h-3.5 w-3.5" /></span>
                    <span className="flex-1 text-[10px] font-semibold">{group.label}</span><span className="text-[9px] text-[#a0a6af]">{group.items.length}</span><ChevronDown className={`h-3 w-3 text-[#8f98a5] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && <div className="border-t border-[#f0f1f3] bg-white px-2 py-1.5">{group.items.map(([label, path]) => { const itemActive = location.pathname === path || location.pathname.startsWith(path + '/'); return <Link key={path} to={path} onClick={() => { setOpen(false); setQuery(''); }} className={`flex items-center border-l-2 px-3 py-1.5 text-[10px] transition-colors ${itemActive ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#66738a] hover:border-[#d9dde2] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}><span className="mr-2 h-1 w-1 bg-current opacity-50" />{label}</Link>; })}</div>}
                </section>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const ProductNavigationMobile: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const active = productNavigationGroups.some(group => group.items.some(([, path]) => location.pathname === path || location.pathname.startsWith(path + '/')));
  const filteredGroups = productNavigationGroups.map(group => ({ ...group, items: group.items.filter(([label]) => label.toLowerCase().includes(query.trim().toLowerCase()) || group.label.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.items.length);
  return <div className="relative flex-1">
    <button type="button" onClick={() => setOpen(v => !v)} className={`flex w-full flex-col items-center py-1 px-1 text-[10px] font-medium ${active || open ? 'font-bold text-[#d31d24]' : 'text-[#7b8492]'}`} aria-expanded={open}><LayoutGrid className="h-5 w-5" /><span className="mt-0.5">More</span></button>
    {open && <div className="fixed bottom-[62px] left-2 right-2 z-50 overflow-hidden border border-[#e1e4e8] bg-white shadow-[0_14px_36px_rgba(23,35,59,.14)]"><div className="border-b border-[#edf0f2] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#17233b]">All features</span><button type="button" onClick={() => setOpen(false)} className="text-[#8a92a0]"><X className="h-4 w-4" /></button></div><div className="relative mt-2"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa1ac]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search features" className="h-8 w-full border border-[#e1e4e8] bg-[#fafbfc] pl-8 text-[10px] outline-none" /></div></div><div className="max-h-[62vh] overflow-y-auto p-2">{filteredGroups.map(group => <div key={group.label} className="mb-3 last:mb-0"><p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-[#9aa1ac]">{group.label}</p><div className="grid grid-cols-2 gap-px bg-[#edf0f2]">{group.items.map(([label,path]) => <Link key={path} to={path} onClick={() => { setOpen(false); setQuery(''); }} className={`bg-white px-2.5 py-2 text-[10px] ${location.pathname === path ? 'font-semibold text-[#d31d24]' : 'text-[#66738a]'}`}>{label}</Link>)}</div></div>)}</div></div>}
  </div>;
};
