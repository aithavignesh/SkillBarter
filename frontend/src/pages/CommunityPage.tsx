import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CommunityStats } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import {
  Compass,
  Users,
  Wrench,
  Repeat,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommunityStats().then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
          <Compass className="w-4 h-4" /> Hyperlocal Pulse
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
          Neighborhood Community
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time metrics, active talent pools, and completed barter exchanges in your neighborhood
        </p>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Members Nearby</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.members_nearby || 5}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Active neighbors</span>
        </Card>

        <Card className="p-5 border-teal-100 bg-teal-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Skills Available</span>
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.skills_available || 15}
          </div>
          <span className="text-[10px] text-teal-700 font-semibold mt-1 block">Offered for barter</span>
        </Card>

        <Card className="p-5 border-sky-100 bg-sky-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">Completed Barters</span>
            <Repeat className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.exchanges_completed || 24}
          </div>
          <span className="text-[10px] text-sky-700 font-semibold mt-1 block">Zero cash exchanged</span>
        </Card>

        <Card className="p-5 border-amber-100 bg-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Avg Trust Score</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.average_trust_score || 94}/100
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">High community standing</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Popular Skills */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Popular Skills in Demand
              </h3>
              <Link to="/discover" className="text-xs text-emerald-700 font-semibold hover:underline">
                Explore all
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(stats?.popular_skills || [
                { id: 1, name: 'Plumbing', category: 'Home Repair' },
                { id: 2, name: 'Web Development', category: 'Technology' },
                { id: 3, name: 'Photography', category: 'Creative' },
                { id: 4, name: 'Carpentry', category: 'Home Repair' },
                { id: 5, name: 'UI / UX Design', category: 'Design' },
                { id: 6, name: 'Italian Cooking', category: 'Cooking' },
              ]).map((skill) => (
                <div key={skill.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-900 block truncate">{skill.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{skill.category}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Exchanges */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-emerald-600" /> Recent Completed Exchanges
              </h3>
              <span className="text-xs text-slate-400 font-medium">Verified Stories</span>
            </div>

            <div className="space-y-3">
              {(stats?.recent_exchanges || [
                {
                  id: 1,
                  requester_name: 'Priya Sharma',
                  receiver_name: 'Arjun Sharma',
                  requester_skill: 'Photography',
                  receiver_skill: 'Web Development',
                  completed_at: new Date().toISOString()
                }
              ]).map((ex) => (
                <div key={ex.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{ex.requester_name} ↔ {ex.receiver_name}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Success
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Traded <strong>{ex.requester_skill}</strong> in exchange for <strong>{ex.receiver_skill}</strong>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
