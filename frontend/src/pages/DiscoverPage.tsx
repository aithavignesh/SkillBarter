import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserSummary } from '../types';
import { Button } from '../components/ui/Button';
import { CommunityMap } from '../components/map/CommunityMap';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Search, MapPin, Repeat, LayoutGrid, Compass, ArrowUpRight, Sparkles, LockKeyhole, Rocket, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMonetizationState } from '../services/monetization';

export const DiscoverPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');
  const [priorityDiscovery, setPriorityDiscovery] = useState(false);
  const [notice, setNotice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [radiusKm, setRadiusKm] = useState(100);
  const [intentFilter, setIntentFilter] = useState<'ALL' | 'OFFER' | 'NEED'>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'DISTANCE' | 'TRUST'>('RELEVANCE');

  const categories = ['All','AI / ML','Web Development','Programming','Design','Data Science','Interview Prep','Photography','Video Editing','Communication'];
  const monetization = useMemo(() => currentUser?.id ? getMonetizationState(Number(currentUser.id)) : null, [currentUser?.id]);
  const premium = Boolean(monetization?.premium);

  const fetchNeighbors = async () => {
    try { setLoading(true); setNearbyUsers(await api.getNearbyUsers()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchNeighbors(); }, []);

  const filteredNeighbors = useMemo(() => {
    const categorySkills: Record<string,string[]> = {
      'Home Repair':['Plumbing','Carpentry','Electrical Work','Painting','Bike Repair'],
      Technology:['Web Development','Mobile App Dev','Python Tutoring'], Design:['UI Design','Graphic Design'], Photography:['Photography','Video Editing'], Cooking:['Cooking','Baking'],
    };
    const q = searchQuery.toLowerCase();
    const results = nearbyUsers.filter((u) => {
      const matchesQuery = !q || [u.full_name, u.headline, ...(u.skills_offered || []), ...(u.skills_needed || [])].filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
      const matchesCat = selectedCategory === 'All' || (u.skill_categories || []).some((category: string) => category.toLowerCase() === selectedCategory.toLowerCase()) || (categorySkills[selectedCategory] || []).some((skill: string) => [...(u.skills_offered || []), ...(u.skills_needed || [])].some((s: string) => s.toLowerCase() === skill.toLowerCase()));
      const matchesRadius = Number(u.distance_km || 999) <= radiusKm;
      const matchesIntent = intentFilter === 'ALL' || (intentFilter === 'OFFER' ? (u.skills_offered || []).length > 0 : (u.skills_needed || []).length > 0);
      const availability = String(u.availability || 'Flexible').toLowerCase();
      const matchesAvailability = availabilityFilter === 'ALL' || availability.includes(availabilityFilter.toLowerCase());
      return matchesQuery && matchesCat && matchesRadius && matchesIntent && matchesAvailability;
    });
    if (!priorityDiscovery || !premium) return results;
    return [...results].sort((a, b) => {
      const score = (u: any) => ((u.trust_score || 0) * 2) + Math.max(0, 100 - Number(u.distance_km || 100)) + ((u.skills_offered || []).length * 3) + (u.featured ? 15 : 0);
      return score(b) - score(a);
    });
  }, [nearbyUsers, searchQuery, selectedCategory, priorityDiscovery, premium, radiusKm, intentFilter, availabilityFilter, sortBy]);

  const openProposal = (user: any) => { setSelectedPartner(user); setDefaultPartnerSkill(user.skills_offered?.[0] || ''); setIsProposeOpen(true); };
  const togglePriorityDiscovery = () => {
    if (!premium) { setNotice('Priority Discovery is a Premium feature. Open Monetization to activate Premium.'); return; }
    setNotice(''); setPriorityDiscovery(value => !value);
  };

  return <AppPageShell eyebrow="Learning discovery" title="Find people who can teach what you want to learn" description="Discover student peers by learning goals, skills, trust and distance — then start an exchange." icon={<Compass className="h-3.5 w-3.5" />} actions={<Link to="/matches"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>My learning matches</Button></Link>} search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Search a skill you want to learn…' }}>
    <div className="flex flex-col gap-3 border border-[#e1e4e8] bg-white p-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2 overflow-x-auto pb-1">{categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap border px-3 py-2 text-xs font-bold transition ${selectedCategory===cat?'border-[#d31d24] bg-[#d31d24] text-white':'border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300'}`}>{cat}</button>)}</div><div className="flex shrink-0 items-center gap-2"><button onClick={()=>setShowAdvanced(v=>!v)} className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-bold ${showAdvanced ? "border-[#d31d24] bg-[#fff5f5] text-[#b8171d]" : "border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300"}`}><SlidersHorizontal className="h-3.5 w-3.5"/>Filters</button><button onClick={togglePriorityDiscovery} className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-bold ${priorityDiscovery&&premium?'border-[#d31d24] bg-[#fff5f5] text-[#b8171d]':'border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300'}`}>{premium?<Sparkles className="h-3.5 w-3.5"/>:<LockKeyhole className="h-3.5 w-3.5"/>}Priority Discovery {premium?(priorityDiscovery?'On':'Off'):'Premium'}</button><div className="flex border border-[#e1e4e8] bg-[#f7f8f7] p-1"><button onClick={()=>setViewMode('GRID')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${viewMode==='GRID'?'bg-white text-[#17233b] shadow-sm':'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5"/>List</button><button onClick={()=>setViewMode('MAP')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${viewMode==='MAP'?'bg-white text-[#17233b] shadow-sm':'text-slate-500'}`}><Compass className="h-3.5 w-3.5"/>Map</button></div></div></div>
    {showAdvanced && <div className="mb-4 border border-[#e1e4e8] bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-[#17233b]">Advanced discovery</p><p className="mt-1 text-[10px] text-slate-500">Find relevant learning partners by radius, what they teach, and availability.</p></div><button onClick={()=>setShowAdvanced(false)} className="text-slate-400 hover:text-[#17233b]" title="Close filters"><X className="h-4 w-4"/></button></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Radius
          <select value={radiusKm} onChange={e=>setRadiusKm(Number(e.target.value))} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value={3}>Within 3 km</option><option value={5}>Within 5 km</option><option value={10}>Within 10 km</option><option value={25}>Within 25 km</option><option value={50}>Within 50 km</option><option value={100}>Within 100 km</option></select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learning intent
          <select value={intentFilter} onChange={e=>setIntentFilter(e.target.value as any)} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value="ALL">All members</option><option value="OFFER">Can teach skills</option><option value="NEED">Wants to learn skills</option></select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sort by\n          <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value="RELEVANCE">Relevance</option><option value="DISTANCE">Nearest first</option><option value="TRUST">Trust score</option></select>\n        </label>\n        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Availability
          <select value={availabilityFilter} onChange={e=>setAvailabilityFilter(e.target.value)} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value="ALL">Any availability</option><option value="weekend">Weekends</option><option value="evening">Evenings</option><option value="flexible">Flexible</option></select>
        </label>
      </div>
    </div>}
    {notice&&<div className="flex items-center justify-between gap-3 border border-[#f1c8ca] bg-[#fff7f7] px-4 py-3 text-xs text-[#8f1a20]"><span>{notice}</span><Link to="/monetization" className="font-bold underline">View Premium</Link></div>}
    {priorityDiscovery&&premium&&<div className="border border-[#e8d4d4] bg-[#fffafa] px-4 py-2.5 text-xs text-[#8f1a20]">Premium ranking is active. Featured profiles receive an additional visibility signal.</div>}
    {viewMode==='MAP'?<div className="border border-[#e1e4e8] bg-white p-2"><CommunityMap users={filteredNeighbors}/></div>:<div className="overflow-hidden border border-[#e1e4e8] bg-white"><div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_170px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid"><span>Member</span><span>They can teach</span><span>Trust / distance</span><span className="text-right">Action</span></div>{loading?<div className="py-20 text-center text-sm text-slate-400">Finding peers who can help you learn…</div>:filteredNeighbors.length===0?<div className="py-20 text-center"><Compass className="mx-auto h-9 w-9 text-slate-300"/><h3 className="mt-3 text-sm font-bold text-[#17233b]">No learning partners found</h3><p className="mt-1 text-xs text-slate-500">Try another skill, category, or wider radius.</p></div>:<div className="divide-y divide-[#e1e4e8]">{filteredNeighbors.map(neighbor=><div key={neighbor.id} className="grid gap-4 px-5 py-4 transition hover:bg-[#fafafa] md:grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_170px] md:items-center"><div className="flex min-w-0 items-center gap-3"><img src={neighbor.avatar_url||'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={neighbor.full_name} className="h-11 w-11 shrink-0 rounded-full border border-[#dfe3e8] object-cover"/><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{neighbor.full_name}</p><p className="truncate text-xs text-slate-500">{neighbor.headline||'SkillBarter member'}</p><div className="mt-1 flex flex-wrap gap-1.5">{neighbor.verified&&<span className="text-[9px] font-bold uppercase tracking-wider text-[#17233b]">Verified</span>}{neighbor.premium&&<span className="text-[9px] font-bold uppercase tracking-wider text-[#d31d24]">Premium</span>}</div>{neighbor.featured&&<span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div></div><div className="flex flex-wrap gap-1.5">{(neighbor.skills_offered||[]).slice(0,4).map((s:string)=><span key={s} className="border border-[#e1e4e8] bg-[#f7f8f7] px-2 py-1 text-[10px] font-semibold text-slate-700">{s}</span>)}</div><div className="text-xs text-slate-500"><p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#d31d24]"/>{neighbor.distance_display||`${neighbor.distance_km||''} km away`}</p><p className="mt-1 font-semibold text-slate-700">★ {Math.round(neighbor.trust_score||0)} trust</p></div><div className="flex justify-start md:justify-end"><Button size="sm" onClick={()=>openProposal(neighbor)} icon={<Repeat className="h-3.5 w-3.5"/>}>Start Exchange</Button></div></div>)}</div>}</div>}
    {selectedPartner&&<ProposeExchangeModal isOpen={isProposeOpen} onClose={()=>setIsProposeOpen(false)} partner={selectedPartner} defaultPartnerSkill={defaultPartnerSkill} onSuccess={()=>{setIsProposeOpen(false); setNotice('Exchange request sent successfully!');}}/>}
  </AppPageShell>;
};