import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { UserSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CommunityMap } from '../components/map/CommunityMap';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import {
  Search,
  MapPin,
  Repeat,
  Sparkles,
  LayoutGrid,
  Compass,
  SlidersHorizontal,
  Wrench,
  HelpCircle
} from 'lucide-react';

export const DiscoverPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Propose Modal State
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');

  const categories = [
    'All',
    'Home Repair',
    'Technology',
    'Design',
    'Education',
    'Photography',
    'Cooking',
    'Fitness',
    'Gardening',
    'Creative'
  ];

  const fetchNeighbors = async () => {
    try {
      setLoading(true);
      const data = await api.getNearbyUsers();
      setNearbyUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeighbors();
  }, []);

  const filteredNeighbors = nearbyUsers.filter((u) => {
    const matchesQuery =
      !searchQuery ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.skills_offered?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.skills_needed?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      selectedCategory === 'All' ||
      // Check if any offered skill matches
      u.skills_offered?.some((s: string) => {
        if (selectedCategory === 'Home Repair') return ['Plumbing', 'Carpentry', 'Electrical Work', 'Painting', 'Bike Repair'].includes(s);
        if (selectedCategory === 'Technology') return ['Web Development', 'Mobile App Dev', 'Python Tutoring'].includes(s);
        if (selectedCategory === 'Design') return ['UI Design', 'Graphic Design'].includes(s);
        if (selectedCategory === 'Photography') return ['Photography', 'Video Editing'].includes(s);
        if (selectedCategory === 'Cooking') return ['Cooking', 'Baking'].includes(s);
        return true;
      });

    return matchesQuery && matchesCat;
  });

  const handleOpenPropose = (user: any, skill?: string) => {
    setSelectedPartner(user);
    setDefaultPartnerSkill(skill || user.skills_offered?.[0] || '');
    setIsProposeOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Hyperlocal Discovery
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            Find Skills Near You
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connect with verified neighbors offering skills within your local exchange radius
          </p>
        </div>

        {/* View Switcher (Grid vs Radar Map) */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setViewMode('GRID')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'GRID'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Grid Cards
          </button>
          <button
            onClick={() => setViewMode('MAP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'MAP'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600" /> Radar Map
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What skill do you need? (e.g. Plumbing, Photography, Web Design, Cooking)..."
            className="w-full text-sm pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'MAP' ? (
        <CommunityMap users={filteredNeighbors} />
      ) : (
        <div>
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              Locating neighbors within your barter radius...
            </div>
          ) : filteredNeighbors.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No neighbors matched this query</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching for a different skill or switch to another category to discover nearby trades.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNeighbors.map((neighbor) => (
                <Card key={neighbor.id} hover className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Header: User avatar, distance & trust */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={neighbor.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                          alt={neighbor.full_name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{neighbor.full_name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-1">{neighbor.headline || 'Neighbor'}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ★ {Math.round(neighbor.trust_score)}
                      </span>
                    </div>

                    {/* Hyperlocal Distance Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {neighbor.distance_display || `${neighbor.distance_km} km away`}
                      </span>
                      {neighbor.availability && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg font-medium">
                          {neighbor.availability}
                        </span>
                      )}
                    </div>

                    {/* Skills Offered */}
                    <div className="space-y-1.5 mb-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Can Provide:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {neighbor.skills_offered?.map((s: string) => (
                          <span key={s} className="text-xs font-medium text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
                            {s}
                          </span>
                        )) || <span className="text-xs text-slate-400">Skills on request</span>}
                      </div>
                    </div>

                    {/* Skills Needed */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Looking For:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {neighbor.skills_needed?.map((s: string) => (
                          <span key={s} className="text-xs font-medium text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/60">
                            {s}
                          </span>
                        )) || <span className="text-xs text-slate-400">Open to offers</span>}
                      </div>
                    </div>
                  </div>

                  {/* Propose Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {neighbor.completed_exchanges_count || 0} barters completed
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenPropose(neighbor)}
                      icon={<Repeat className="w-3.5 h-3.5" />}
                    >
                      Propose Exchange
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Propose Exchange Modal */}
      {selectedPartner && (
        <ProposeExchangeModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          partner={selectedPartner}
          defaultPartnerSkill={defaultPartnerSkill}
          onSuccess={() => {
            alert('Barter request sent successfully!');
          }}
        />
      )}
    </div>
  );
};
