import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserSummary } from '../types';
import { Button } from '../components/ui/Button';
import { CommunityMap } from '../components/map/CommunityMap';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Search, MapPin, Repeat, LayoutGrid, Compass, ArrowUpRight } from 'lucide-react';

export const DiscoverPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');

  const categories = ['All','Home Repair','Technology','Design','Education','Photography','Cooking','Fitness','Gardening','Creative'];
  const fetchNeighbors = async () => {
    try { setLoading(true); setNearbyUsers(await api.getNearbyUsers()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchNeighbors(); }, []);

  const filteredNeighbors = nearbyUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || [u.full_name, u.headline, ...(u.skills_offered || []), ...(u.skills_needed || [])].filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
    const categorySkills: Record<string,string[]> = {
      'Home Repair':['Plumbing','Carpentry','Electrical Work','Painting','Bike Repair'],
      Technology:['Web Development','Mobile App Dev','Python Tutoring'],
      Design:['UI Design','Graphic Design'], Photography:['Photography','Video Editing'], Cooking:['Cooking','Baking'],
    };
    const matchesCat = selectedCategory === 'All' || (u.skills_offered || []).some((s: string) => (categorySkills[selectedCategory] || [s]).includes(s));
    return matchesQuery && matchesCat;
  });

  const openProposal = (user: any) => {
    setSelectedPartner(user); setDefaultPartnerSkill(user.skills_offered?.[0] || ''); setIsProposeOpen(true);
  };

  return (
    <AppPageShell
      eyebrow="Discovery"
      title="Find skills near you"
      description="Search local members by skill, compare trust and distance, then start a real exchange."
      icon={<Compass className="h-3.5 w-3.5" />}
      actions={<Link to="/matches"><Button size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />}>Smart matches</Button></Link>}
      search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Search people or skills…' }}
    >
      <div className="flex flex-col gap-3 border border-[#e1e4e8] bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap border px-3 py-2 text-xs font-bold transition ${selectedCategory === cat ? 'border-[#d31d24] bg-[#d31d24] text-white' : 'border-[#e1e4e8] bg-white text-slate-600 hover:border-slate-300'}`}>{cat}</button>)}
        </div>
        <div className="flex shrink-0 border border-[#e1e4e8] bg-[#f7f8f7] p-1">
          <button onClick={() => setViewMode('GRID')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${viewMode === 'GRID' ? 'bg-white text-[#17233b] shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5" />List</button>
          <button onClick={() => setViewMode('MAP')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${viewMode === 'MAP' ? 'bg-white text-[#17233b] shadow-sm' : 'text-slate-500'}`}><Compass className="h-3.5 w-3.5" />Map</button>
        </div>
      </div>

      {viewMode === 'MAP' ? <div className="border border-[#e1e4e8] bg-white p-2"><CommunityMap users={filteredNeighbors} /></div> : (
        <div className="overflow-hidden border border-[#e1e4e8] bg-white">
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_170px] border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid"><span>Member</span><span>Skills offered</span><span>Location / trust</span><span className="text-right">Action</span></div>
          {loading ? <div className="py-20 text-center text-sm text-slate-400">Finding members near you…</div> : filteredNeighbors.length === 0 ? <div className="py-20 text-center"><Compass className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-3 text-sm font-bold text-[#17233b]">No members found</h3><p className="mt-1 text-xs text-slate-500">Try another skill or category.</p></div> : <div className="divide-y divide-[#e1e4e8]">
            {filteredNeighbors.map((neighbor) => <div key={neighbor.id} className="grid gap-4 px-5 py-4 transition hover:bg-[#fafafa] md:grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_170px] md:items-center">
              <div className="flex min-w-0 items-center gap-3"><img src={neighbor.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'} alt={neighbor.full_name} className="h-11 w-11 shrink-0 rounded-full border border-[#dfe3e8] object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17233b]">{neighbor.full_name}</p><p className="truncate text-xs text-slate-500">{neighbor.headline || 'SkillBarter member'}</p></div></div>
              <div className="flex flex-wrap gap-1.5">{(neighbor.skills_offered || []).slice(0,4).map((s: string) => <span key={s} className="border border-[#e1e4e8] bg-[#f7f8f7] px-2 py-1 text-[10px] font-semibold text-slate-700">{s}</span>)}</div>
              <div className="text-xs text-slate-500"><p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#d31d24]" />{neighbor.distance_display || `${neighbor.distance_km || ''} km away`}</p><p className="mt-1 font-semibold text-slate-700">★ {Math.round(neighbor.trust_score || 0)} trust</p></div>
              <div className="flex justify-start md:justify-end"><Button size="sm" onClick={() => openProposal(neighbor)} icon={<Repeat className="h-3.5 w-3.5" />}>Propose</Button></div>
            </div>)}
          </div>}
        </div>
      )}

      {selectedPartner && <ProposeExchangeModal isOpen={isProposeOpen} onClose={() => setIsProposeOpen(false)} partner={selectedPartner} defaultPartnerSkill={defaultPartnerSkill} onSuccess={() => { setIsProposeOpen(false); alert('Barter request sent successfully!'); }} />}
    </AppPageShell>
  );
};
