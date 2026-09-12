import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MatchResult, UserSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import {
  Sparkles,
  Repeat,
  MapPin,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Info
} from 'lucide-react';

export const SkillMatchesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Propose Modal State
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');
  const [defaultMySkill, setDefaultMySkill] = useState('');

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await api.getMatches();
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleOpenPropose = (match: MatchResult) => {
    setSelectedPartner(match.candidate);
    setDefaultPartnerSkill(match.they_offer?.[0] || '');
    setDefaultMySkill(match.matched_you_offer?.[0] || '');
    setIsProposeOpen(true);
  };

  const offeredList = currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => s.skill_name) || [];
  const neededList = currentUser?.skills?.filter(s => s.skill_type === 'NEEDED').map(s => s.skill_name) || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div>
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-4 h-4" /> Smart Reciprocal Engine
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
          Hyperlocal Skill Matches
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Algorithmic 2-way compatibility calculated dynamically from your offered skills, needed skills, proximity, and trust score.
        </p>
      </div>

      {/* Current User Skill Equation Box */}
      <Card className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border-emerald-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Your Current Barter Profile:
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">You Offer:</span>
              <span className="font-bold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                {offeredList.join(', ') || 'Web Development'}
              </span>
              <span className="text-slate-400">↔</span>
              <span className="text-slate-600 font-medium">You Need:</span>
              <span className="font-bold text-teal-900 bg-teal-100/80 px-2 py-0.5 rounded-md">
                {neededList.join(', ') || 'Plumbing, Carpentry'}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Your Trust: {Math.round(currentUser?.trust_score || 94)}/100
            </span>
          </div>
        </div>
      </Card>

      {/* Matches List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">
          Calculating reciprocal neighbor compatibility...
        </div>
      ) : matches.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Repeat className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No reciprocal matches found right now</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adding more skills you can offer or broadening what skills you need to find more local trades.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {matches.map((match, idx) => (
            <Card key={idx} hover className="p-6 border-slate-200/90 relative overflow-hidden">
              {/* Highlight ribbon for direct reciprocal trades */}
              {match.is_reciprocal && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl shadow-xs uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Direct 2-Way Barter
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Neighbor Info & Distance */}
                <div className="lg:col-span-4 flex items-start gap-4">
                  <img
                    src={match.candidate?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'}
                    alt={match.candidate?.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400 shadow-sm shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{match.candidate?.full_name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{match.candidate?.headline || 'Neighbor'}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {match.distance_display}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        ★ {Math.round(match.candidate?.trust_score || 90)} Trust
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Visual Two-Way Barter Flow */}
                <div className="lg:col-span-5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-slate-700">Reciprocal Exchange Plan:</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono">
                      {match.match_score}% <span className="text-xs font-bold text-slate-500">Match</span>
                    </span>
                  </div>

                  {/* Compatibility visual indicator */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs">
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">You Offer</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {match.matched_you_offer?.[0] || offeredList[0] || 'Web Development'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center shrink-0 px-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                        <Repeat className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 uppercase mt-0.5">Barter</span>
                    </div>

                    <div className="text-right flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">They Offer</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {match.they_offer?.[0] || 'Plumbing'}
                      </span>
                    </div>
                  </div>

                  {/* Reasons checklist */}
                  <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                    {match.reasons.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Breakdown & Action Button */}
                <div className="lg:col-span-3 flex flex-col justify-between h-full space-y-4">
                  <div className="text-[11px] space-y-1.5 text-slate-500">
                    <div className="flex justify-between">
                      <span>Skill Compatibility:</span>
                      <strong className="text-slate-800">{match.score_breakdown.skill_compatibility} / 50</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Location Proximity:</span>
                      <strong className="text-slate-800">{match.score_breakdown.location_proximity} / 20</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Trust Rating:</span>
                      <strong className="text-slate-800">{match.score_breakdown.trust} / 20</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Availability Overlap:</span>
                      <strong className="text-slate-800">{match.score_breakdown.availability} / 10</strong>
                    </div>
                  </div>

                  <Button
                    size="md"
                    className="w-full shadow-sm"
                    onClick={() => handleOpenPropose(match)}
                    icon={<Repeat className="w-4 h-4" />}
                  >
                    Propose Exchange
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Propose Exchange Modal */}
      {selectedPartner && (
        <ProposeExchangeModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          partner={selectedPartner}
          defaultPartnerSkill={defaultPartnerSkill}
          defaultMySkill={defaultMySkill}
          onSuccess={() => {
            alert('Exchange request sent successfully!');
          }}
        />
      )}
    </div>
  );
};
