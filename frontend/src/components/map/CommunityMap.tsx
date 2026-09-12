import React, { useState } from 'react';
import { UserSummary } from '../../types';
import { ProposeExchangeModal } from '../exchange/ProposeExchangeModal';
import { Button } from '../ui/Button';
import { MapPin, Navigation, ShieldCheck, Repeat, User, Sparkles } from 'lucide-react';

interface CommunityMapProps {
  users: any[];
  centerUser?: any;
}

export const CommunityMap: React.FC<CommunityMapProps> = ({ users, centerUser }) => {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [activeRadius, setActiveRadius] = useState<number>(10);

  // Filter users by active radius
  const filteredUsers = users.filter((u) => (u.distance_km || 1.8) <= activeRadius);

  // Calculate coordinates on radar canvas (polar coordinates converted to Cartesian %)
  const getCoordinates = (index: number, total: number, distanceKm: number) => {
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
    // Map distance relative to active radius (scale from 15% to 45% of radar radius)
    const normalizedDist = Math.min(Math.max((distanceKm || 1.0) / activeRadius, 0.2), 0.95);
    const radiusPercent = normalizedDist * 42; // percentage from center
    const x = 50 + radiusPercent * Math.cos(angle);
    const y = 50 + radiusPercent * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
      {/* Map Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 z-10 relative">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Navigation className="w-4 h-4 animate-spin-slow" /> Hyperlocal Neighborhood Radar
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">
            Nearby Skill Barter Community
          </h3>
          <p className="text-xs text-slate-400">
            Discover {filteredUsers.length} neighbors within {activeRadius} km offering and seeking skills
          </p>
        </div>

        {/* Radius pills */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80">
          <span className="text-[10px] text-slate-400 px-2 font-medium">Radius:</span>
          {[2, 5, 10, 25].map((r) => (
            <button
              key={r}
              onClick={() => setActiveRadius(r)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeRadius === r
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Radar Canvas Container */}
      <div className="relative w-full aspect-square max-w-xl mx-auto flex items-center justify-center my-4 select-none">
        {/* Concentric distance rings */}
        <div className="absolute inset-0 rounded-full border border-slate-800/80 pointer-events-none" />
        <div className="absolute inset-[15%] rounded-full border border-slate-800/60 pointer-events-none" />
        <div className="absolute inset-[30%] rounded-full border border-slate-800/50 pointer-events-none" />
        <div className="absolute inset-[45%] rounded-full border border-slate-700/60 pointer-events-none" />

        {/* Distance labels */}
        <span className="absolute top-[32%] text-[9px] font-mono text-slate-600">
          {(activeRadius * 0.3).toFixed(1)} km
        </span>
        <span className="absolute top-[17%] text-[9px] font-mono text-slate-600">
          {(activeRadius * 0.65).toFixed(1)} km
        </span>
        <span className="absolute top-[2%] text-[9px] font-mono text-slate-600">
          {activeRadius} km
        </span>

        {/* Center: YOU */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
          </div>
          <span className="mt-1 px-2 py-0.5 bg-emerald-950/90 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-700/60 shadow-sm">
            YOU
          </span>
        </div>

        {/* Neighbor Pins */}
        {filteredUsers.map((neighbor, idx) => {
          const { x, y } = getCoordinates(idx, filteredUsers.length, neighbor.distance_km);
          const isSelected = selectedUser?.id === neighbor.id;
          const primaryOffer = neighbor.skills_offered?.[0] || 'Skill';

          return (
            <div
              key={neighbor.id}
              style={{ top: `${y}%`, left: `${x}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
              onClick={() => setSelectedUser(neighbor)}
            >
              <div className="relative flex flex-col items-center">
                {/* Avatar Pin */}
                <div
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform transform group-hover:scale-125 shadow-md ${
                    isSelected
                      ? 'border-emerald-400 ring-4 ring-emerald-500/30 scale-110'
                      : 'border-slate-400 group-hover:border-emerald-400'
                  }`}
                >
                  <img
                    src={neighbor.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                    alt={neighbor.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Floating Skill & Distance Tag */}
                <div className="mt-1 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm border border-slate-700 px-1.5 py-0.5 rounded-full text-[10px] whitespace-nowrap shadow-sm">
                  <span className="font-semibold text-slate-200">{neighbor.full_name.split(' ')[0]}</span>
                  <span className="text-emerald-400 font-medium">({neighbor.distance_display || `${neighbor.distance_km} km`})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Neighbor Card Preview */}
      {selectedUser && (
        <div className="mt-4 p-4 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <img
              src={selectedUser.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
              alt={selectedUser.full_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">{selectedUser.full_name}</h4>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  ★ {Math.round(selectedUser.trust_score)} Trust
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{selectedUser.headline || 'Community Member'}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">{selectedUser.distance_display || `${selectedUser.distance_km} km away`}</span>
                <span>•</span>
                <span>Offers: <strong className="text-slate-200">{selectedUser.skills_offered?.join(', ') || 'Custom Skills'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedUser(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => setIsProposeOpen(true)}
              icon={<Repeat className="w-3.5 h-3.5" />}
            >
              Propose Exchange
            </Button>
          </div>
        </div>
      )}

      {/* Propose Exchange Modal */}
      {selectedUser && (
        <ProposeExchangeModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          partner={selectedUser}
          defaultPartnerSkill={selectedUser.skills_offered?.[0] || ''}
          onSuccess={() => {
            alert('Barter request sent successfully!');
          }}
        />
      )}
    </div>
  );
};
