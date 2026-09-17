import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ChevronDown, UserRound, Compass, ArrowLeftRight, Bell, Users, GraduationCap, Coins, LifeBuoy } from 'lucide-react';

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

export const ProductNavigation: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const location = useLocation();
  const active = productNavigationGroups.some(group => group.items.some(([, path]) => location.pathname === path || location.pathname.startsWith(path + '/')));

  const toggle = (label: string) => setExpandedGroup(current => current === label ? null : label);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${open || active ? 'text-[#d31d24]' : 'text-[#697386] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}
        aria-expanded={open}
        aria-controls="skillbarter-all-features"
      >
        <LayoutGrid className="h-4 w-4" />
        <span>All features</span>
        <span className="ml-auto text-[9px] font-medium text-[#a0a6af]">{productNavigationGroups.reduce((total, group) => total + group.items.length, 0)}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id="skillbarter-all-features" className="mt-1 max-h-[46vh] overflow-y-auto border-y border-[#edf0f2] bg-[#fafbfc] py-1">
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold text-[#17233b]">All SkillBarter features</p>
            <p className="mt-0.5 text-[9px] leading-4 text-[#8a92a0]">Open any feature directly. Your workspace stays focused on the essentials.</p>
          </div>
          <div className="space-y-0.5 px-2 pb-2">
            {productNavigationGroups.map(group => {
              const GroupIcon = group.icon;
              const groupActive = group.items.some(([, path]) => location.pathname === path || location.pathname.startsWith(path + '/'));
              const expanded = expandedGroup === group.label || groupActive;
              return (
                <section key={group.label} className="border border-[#edf0f2] bg-white">
                  <button
                    type="button"
                    onClick={() => toggle(group.label)}
                    className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[10px] font-semibold ${groupActive ? 'text-[#d31d24]' : 'text-[#536075] hover:text-[#17233b]'}`}
                    aria-expanded={expanded}
                  >
                    <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">{group.label}</span>
                    <span className="text-[9px] font-normal text-[#a0a6af]">{group.items.length}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="border-t border-[#f0f1f3] px-1.5 py-1">
                      {group.items.map(([label, path]) => {
                        const itemActive = location.pathname === path || location.pathname.startsWith(path + '/');
                        return (
                          <Link
                            key={path}
                            to={path}
                            className={`block border-l-2 px-2 py-1.5 text-[10px] transition-colors ${itemActive ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#66738a] hover:border-[#e3e5e8] hover:bg-[#fafbfc] hover:text-[#17233b]'}`}
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductNavigationMobile: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = productNavigationGroups.some(group => group.items.some(([, path]) => location.pathname === path || location.pathname.startsWith(path + '/')));
  return (
    <div className="relative flex-1">
      <button type="button" onClick={() => setOpen(v => !v)} className={`flex w-full flex-col items-center py-1 px-1 text-[10px] font-medium ${active ? 'text-[#d31d24] font-bold' : 'text-[#7b8492]'}`} aria-expanded={open}>
        <LayoutGrid className={`h-5 w-5 ${active ? 'text-[#d31d24]' : 'text-[#7b8492]'}`} /><span className="mt-0.5">More</span>
      </button>
      {open && <div className="fixed bottom-[62px] left-2 right-2 z-50 max-h-[70vh] overflow-y-auto border border-[#e1e4e8] bg-white p-3 shadow-[0_14px_36px_rgba(23,35,59,.14)]"><div className="mb-3 flex items-center justify-between border-b border-[#edf0f2] pb-2"><span className="text-xs font-bold text-[#17233b]">All features</span><button type="button" onClick={() => setOpen(false)} className="text-[10px] font-semibold text-[#d31d24]">Close</button></div>{productNavigationGroups.map(group => <div key={group.label} className="mb-4"><p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-wide text-[#9aa1ac]">{group.label}</p><div className="grid grid-cols-2 gap-1">{group.items.map(([label,path]) => <Link key={path} to={path} onClick={() => setOpen(false)} className={`border-l-2 px-2 py-2 text-[11px] ${location.pathname === path ? 'border-[#d31d24] bg-[#fff7f7] font-semibold text-[#d31d24]' : 'border-transparent text-[#66738a] hover:bg-[#fafbfc]'}`}>{label}</Link>)}</div></div>)}</div>}
    </div>
  );
};
