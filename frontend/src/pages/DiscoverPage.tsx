import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { UserSummary } from '../types';
import { Button } from '../components/ui/Button';
import { CommunityMap } from '../components/map/CommunityMap';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { MapPin, Repeat, LayoutGrid, Compass, ArrowUpRight, Sparkles, LockKeyhole, Rocket, SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMonetizationState } from '../services/monetization';
import { trackEvent } from '../services/analytics';

export const DiscoverPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');
  const [defaultMySkill, setDefaultMySkill] = useState('');
  const [priorityDiscovery, setPriorityDiscovery] = useState(false);
  const [notice, setNotice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [radiusKm, setRadiusKm] = useState(100);
  const [intentFilter, setIntentFilter] = useState<'ALL' | 'OFFER' | 'NEED'>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'RELEVANCE' | 'DISTANCE' | 'TRUST'>('RELEVANCE');
  const [expandedNeighborId, setExpandedNeighborId] = useState<string | number | null>(null);

  const categories = ['All','AI / ML','Web Development','Programming','Design','Data Science','Interview Prep','Photography','Video Editing','Communication'];
  const monetization = useMemo(() => currentUser?.id ? getMonetizationState(Number(currentUser.id)) : null, [currentUser?.id]);
  const premium = Boolean(monetization?.premium);

  const fetchNeighbors = async () => {
    try { setLoading(true); setLoadError(''); setNearbyUsers(await api.getNearbyUsers()); }
    catch (e) { console.error(e); setLoadError(e instanceof Error ? e.message : 'Unable to load learning partners.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchNeighbors(); }, []);

  const filteredNeighbors = useMemo(() => {
    const categorySkills: Record<string,string[]> = {
      'AI / ML':['AI / ML','Machine Learning','Deep Learning','Artificial Intelligence'],
      'Web Development':['Web Development','React','Frontend','Backend','Full Stack'],
      Programming:['Python','Java','C++','JavaScript','Data Structures & Algorithms'],
      Design:['UI Design','Graphic Design','Figma','UX Design'],
      'Data Science':['Data Science','Python','SQL','Machine Learning','Data Analytics'],
      'Interview Prep':['Interview Preparation','DSA','Resume Review','Mock Interviews'],
      Photography:['Photography'],
      'Video Editing':['Video Editing'],
      Communication:['Public Speaking','Communication','English'],
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
    const sorted = [...results];
    if (sortBy === 'DISTANCE') sorted.sort((a, b) => Number(a.distance_km || 999) - Number(b.distance_km || 999));
    if (sortBy === 'TRUST') sorted.sort((a, b) => Number(b.trust_score || 0) - Number(a.trust_score || 0));
    if (sortBy === 'RELEVANCE') sorted.sort((a, b) => {
      const score = (u: any) => ((u.trust_score || 0) * 0.4) + Math.max(0, 100 - Number(u.distance_km || 100)) * 0.2 + ((u.skills_offered || []).length * 3);
      return score(b) - score(a);
    });
    if (!priorityDiscovery || !premium) return sorted;
    return sorted.sort((a, b) => {
      const score = (u: any) => ((u.trust_score || 0) * 2) + Math.max(0, 100 - Number(u.distance_km || 100)) + ((u.skills_offered || []).length * 3) + (u.featured ? 15 : 0);
      return score(b) - score(a);
    });
  }, [nearbyUsers, searchQuery, selectedCategory, priorityDiscovery, premium, radiusKm, intentFilter, availabilityFilter, sortBy]);

  const openProposal = (user: any) => {
    trackEvent('activation_cta_clicked', { source: 'discover', action: 'start_exchange' });
    setSelectedPartner(user);
    setDefaultPartnerSkill(user.skills_offered?.[0] || '');
    setDefaultMySkill(currentUser?.skills?.find((s: any) => s.skill_type === 'OFFERED')?.skill_name || '');
    setIsProposeOpen(true);
  };
  const togglePriorityDiscovery = () => {
    if (!premium) { setNotice('Priority Discovery is a Premium feature. Open Monetization to activate Premium.'); return; }
    setNotice(''); setPriorityDiscovery(value => !value);
  };
  const getRelevantSkills = (neighbor: any) => {
    const categorySkills: Record<string, string[]> = {
      'AI / ML': ['AI / ML', 'Machine Learning', 'Deep Learning', 'Artificial Intelligence'],
      'Web Development': ['Web Development', 'React', 'Frontend', 'Backend', 'Full Stack'],
      Programming: ['Python', 'Java', 'C++', 'JavaScript', 'Data Structures & Algorithms'],
      Design: ['UI Design', 'Graphic Design', 'Figma', 'UX Design'],
      'Data Science': ['Data Science', 'Python', 'SQL', 'Machine Learning', 'Data Analytics'],
      'Interview Prep': ['Interview Preparation', 'DSA', 'Resume Review', 'Mock Interviews'],
      Photography: ['Photography'],
      'Video Editing': ['Video Editing'],
      Communication: ['Public Speaking', 'Communication', 'English'],
    };
    const terms = [
      searchQuery.trim().toLowerCase(),
      ...(selectedCategory !== 'All' ? [selectedCategory, ...(categorySkills[selectedCategory] || [])] : []),
    ].filter(Boolean);
    if (!terms.length) return [];
    return (neighbor.skills_offered || []).filter((skill: string) =>
      terms.some(term => skill.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(skill.toLowerCase())),
    );
  };
  const appliedFilters = [
    searchQuery.trim() ? { label: `Search: ${searchQuery.trim()}`, clear: () => setSearchQuery('') } : null,
    selectedCategory !== 'All' ? { label: selectedCategory, clear: () => setSelectedCategory('All') } : null,
    radiusKm !== 100 ? { label: `Within ${radiusKm} km`, clear: () => setRadiusKm(100) } : null,
    intentFilter !== 'ALL' ? { label: intentFilter === 'OFFER' ? 'Can teach skills' : 'Wants to learn skills', clear: () => setIntentFilter('ALL') } : null,
    availabilityFilter !== 'ALL' ? { label: availabilityFilter === 'weekend' ? 'Weekends' : availabilityFilter === 'evening' ? 'Evenings' : 'Flexible', clear: () => setAvailabilityFilter('ALL') } : null,
    sortBy !== 'RELEVANCE' ? { label: sortBy === 'DISTANCE' ? 'Nearest first' : 'Highest trust', clear: () => setSortBy('RELEVANCE') } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];

  if (loadError || (loading && viewMode === 'MAP')) {
    return (
      <AppPageShell
        eyebrow="Learning discovery"
        title="Find people who can teach what you want to learn"
        description="Discover student peers by learning goals, skills, trust and distance — then start an exchange."
        icon={<Compass className="h-3.5 w-3.5" />}
        actions={<Link to="/matches"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>My learning matches</Button></Link>}
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Search a skill you want to learn…' }}
      >
        <div className="border border-[#e1e4e8] bg-white px-5 py-14 text-center" role={loadError ? 'alert' : 'status'}>
          {loadError ? (
            <>
              <h2 className="text-sm font-bold text-[#17233b]">We couldn’t load learning partners</h2>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600">Your filters are unchanged. Please try again.</p>
              <Button size="sm" className="mt-4" onClick={() => void fetchNeighbors()} loading={loading} icon={<RefreshCw className="h-3.5 w-3.5" />}>Try again</Button>
            </>
          ) : <p className="text-sm text-slate-600">Loading nearby learning partners…</p>}
        </div>
      </AppPageShell>
    );
  }

  return <AppPageShell eyebrow="Learning discovery" title="Find people who can teach what you want to learn" description="Discover student peers by learning goals, skills, trust and distance — then start an exchange." icon={<Compass className="h-3.5 w-3.5" />} actions={<Link to="/matches"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>My learning matches</Button></Link>} search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Search a skill you want to learn…' }}>
    <div className="flex flex-col gap-3 border border-[#e1e4e8] bg-white p-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2 overflow-x-auto pb-1">{categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap border px-3 py-2 text-xs font-bold transition ${selectedCategory===cat?'border-[#d31d24] bg-[#d31d24] text-white':'border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300'}`}>{cat}</button>)}</div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center gap-2"><button onClick={()=>{ trackEvent('activation_cta_clicked', { source: 'discover', action: 'toggle_filters' }); setShowAdvanced(v=>!v); }} className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-bold ${showAdvanced ? "border-[#d31d24] bg-[#fff5f5] text-[#b8171d]" : "border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300"}`}><SlidersHorizontal className="h-3.5 w-3.5"/>Filters</button><button onClick={togglePriorityDiscovery} className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-bold ${priorityDiscovery&&premium?'border-[#d31d24] bg-[#fff5f5] text-[#b8171d]':'border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300'}`}>{premium?<Sparkles className="h-3.5 w-3.5"/>:<LockKeyhole className="h-3.5 w-3.5"/>}Priority Discovery {premium?(priorityDiscovery?'On':'Off'):'Premium'}</button><div className="flex border border-[#e1e4e8] bg-[#f7f8f7] p-1"><button onClick={()=>{ trackEvent('activation_cta_clicked', { source: 'discover', action: 'list_view' }); setViewMode('GRID'); }} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${viewMode==='GRID'?'bg-white text-[#17233b] shadow-sm':'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5"/>List</button><button onClick={()=>{ trackEvent('activation_cta_clicked', { source: 'discover', action: 'map_view' }); setViewMode('MAP'); }} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${viewMode==='MAP'?'bg-white text-[#17233b] shadow-sm':'text-slate-500'}`}><Compass className="h-3.5 w-3.5"/>Map</button></div></div></div>
    {showAdvanced && <div className="mb-4 border border-[#e1e4e8] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#17233b]">Advanced discovery</p><p className="mt-1 text-[10px] text-slate-500">Find relevant learning partners by radius, what they teach, and availability.</p></div><button type="button" onClick={()=>setShowAdvanced(false)} className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500 hover:text-[#17233b]" aria-label="Close filters"><X className="h-4 w-4"/></button></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Radius
          <select value={radiusKm} onChange={e=>setRadiusKm(Number(e.target.value))} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value={3}>Within 3 km</option><option value={5}>Within 5 km</option><option value={10}>Within 10 km</option><option value={25}>Within 25 km</option><option value={50}>Within 50 km</option><option value={100}>Within 100 km</option></select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learning intent
          <select value={intentFilter} onChange={e=>setIntentFilter(e.target.value as any)} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value="ALL">All members</option><option value="OFFER">Can teach skills</option><option value="NEED">Wants to learn skills</option></select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sort by
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value="RELEVANCE">Relevance</option><option value="DISTANCE">Nearest first</option><option value="TRUST">Trust score</option></select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Availability
          <select value={availabilityFilter} onChange={e=>setAvailabilityFilter(e.target.value)} className="mt-1 h-10 w-full border border-[#d9dde2] bg-white px-3 text-xs"><option value="ALL">Any availability</option><option value="weekend">Weekends</option><option value="evening">Evenings</option><option value="flexible">Flexible</option></select>
        </label>
      </div>
    </div>}
    {notice&&<div className="flex items-center justify-between gap-3 border border-[#f1c8ca] bg-[#fff7f7] px-4 py-3 text-xs text-[#8f1a20]"><span>{notice}</span><Link to="/monetization" className="font-bold underline">View Premium</Link></div>}
    {!loading && searchQuery && filteredNeighbors.length > 0 && <div className="mb-4 border border-[#ead0d1] bg-[#fff8f8] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">Learning search</p><p className="mt-1 text-xs text-[#17233b]">Showing peers connected to <b>“{searchQuery}”</b>. Check what they can teach, then start a short learning request.</p></div>}
    {priorityDiscovery&&premium&&<div className="border border-[#e8d4d4] bg-[#fffafa] px-4 py-2.5 text-xs text-[#8f1a20]">Premium ranking is active. Featured profiles receive an additional visibility signal.</div>}
    {viewMode==='MAP'?<div className="border border-[#e1e4e8] bg-white p-2"><CommunityMap users={filteredNeighbors}/></div>:<div className="space-y-3">{!loading && appliedFilters.length > 0 && <div className="flex items-center gap-3 overflow-x-auto border border-[#e1e4e8] bg-white px-4 py-3"><span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Showing {filteredNeighbors.length} learning {filteredNeighbors.length === 1 ? 'partner' : 'partners'}</span><div className="flex min-w-max gap-2">{appliedFilters.map(filter=><button key={filter.label} onClick={filter.clear} className="inline-flex items-center gap-1 border border-[#e1e4e8] bg-[#f7f8f7] px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-[#d31d24] hover:text-[#b8171d]">{filter.label}<X className="h-3 w-3"/></button>)}</div></div>}<div className="space-y-3">{loading?<div className="border border-[#e1e4e8] bg-white py-20 text-center text-sm text-slate-400">Finding peers who can help you learn…</div>:filteredNeighbors.length===0?<div className="border border-[#e1e4e8] bg-white py-16 px-5 text-center"><Compass className="mx-auto h-9 w-9 text-slate-300"/><h3 className="mt-3 text-sm font-bold text-[#17233b]">We couldn’t find people matching these filters.</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Try widening your radius or removing a filter. You can also browse My Learning Matches for complementary skill recommendations.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={()=>{setSearchQuery('');setSelectedCategory('All');setRadiusKm(100);setIntentFilter('ALL');setAvailabilityFilter('ALL');setSortBy('RELEVANCE');}} className="border border-[#e1e4e8] bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-slate-300">Clear filters</button><Link to="/matches"><Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>View My Learning Matches</Button></Link></div></div>:filteredNeighbors.map(neighbor=>{const relevantSkills=getRelevantSkills(neighbor); const expanded=expandedNeighborId===neighbor.id; return <article key={neighbor.id} tabIndex={0} onFocus={()=>setExpandedNeighborId(neighbor.id)} onClick={()=>setExpandedNeighborId(expanded?null:neighbor.id)} className={`discover-person-card border bg-white p-4 outline-none sm:p-5 ${expanded?'discover-person-card--expanded':''}`}><div className="flex flex-col gap-4 md:flex-row md:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><img src={neighbor.avatar_url||'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={neighbor.full_name} className="h-12 w-12 shrink-0 rounded-full border border-[#dfe3e8] object-cover"/><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{neighbor.full_name}</p><p className="truncate text-xs text-slate-500">{neighbor.headline||'SkillBarter member'}</p><div className="mt-2 flex flex-wrap gap-1.5">{neighbor.verified&&<span className="text-[9px] font-bold uppercase tracking-wider text-[#17233b]">Verified</span>}{neighbor.premium&&<span className="text-[9px] font-bold uppercase tracking-wider text-[#d31d24]">Premium</span>}{neighbor.featured&&<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#d31d24]"><Rocket className="h-3 w-3"/>Featured</span>}</div></div></div><div className="min-w-0 flex-1"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">They can teach</p><div className="flex flex-wrap gap-1.5">{(neighbor.skills_offered||[]).slice(0,5).map((s:string)=><span key={s} className={`border px-2 py-1 text-[10px] font-semibold ${relevantSkills.includes(s)?'border-[#d31d24] bg-[#fff5f5] text-[#b8171d]':'border-[#e1e4e8] bg-[#f7f8f7] text-slate-700'}`}>{s}</span>)}</div></div><div className="flex shrink-0 flex-col gap-2 text-xs text-slate-500 md:w-36"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#d31d24]"/>{neighbor.distance_display||`${neighbor.distance_km||''} km away`}</span><span className="font-semibold text-slate-700">★ {Math.round(neighbor.trust_score||0)} trust</span></div><div className="w-full shrink-0 md:w-auto"><Button size="sm" className="w-full whitespace-normal leading-4 md:w-auto" onClick={(event)=>{event.stopPropagation();openProposal(neighbor)}} icon={<Repeat className="h-3.5 w-3.5"/>}>Start Learning Exchange</Button></div></div><div className={`discover-person-card__detail ${expanded?'discover-person-card__detail--visible':''}`} aria-hidden={!expanded}><p className="text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">Why you might care</p><p className="mt-1 text-xs leading-5 text-slate-600">{relevantSkills.length>0?`You’re looking for ${searchQuery || selectedCategory.toLowerCase()} and they can teach ${relevantSkills.join(' and ')}.`:'Review their teaching skills, distance, and trust before opening the profile.'}</p></div></article>})}</div></div>}
    {selectedPartner&&<ProposeExchangeModal isOpen={isProposeOpen} onClose={()=>setIsProposeOpen(false)} partner={selectedPartner} defaultPartnerSkill={defaultPartnerSkill} defaultMySkill={defaultMySkill} onSuccess={()=>{ trackEvent('exchange_request_sent', { source: 'discover' }); setIsProposeOpen(false); setNotice('Learning request sent.'); navigate('/exchanges');}}/>}
  </AppPageShell>;
};