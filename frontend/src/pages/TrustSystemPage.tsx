import React, { useState, useEffect } from 'react';
import { AppPageShell } from '../components/ui/AppPageShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TrustScoreRing } from '../components/ui/TrustScoreRing';
import {
  ShieldCheck,
  Award,
  CheckCircle,
  TrendingUp,
  HelpCircle,
  Users,
  Repeat,
  AlertTriangle
} from 'lucide-react';

export const TrustSystemPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [trustData, setTrustData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser) {
      Promise.all([api.getUserProfile(currentUser.id), api.getReviews(currentUser.id), api.getExchanges()]).then(([data, reviewData, exchangeData]) => {
        setTrustData(data);
        setReviews(reviewData || []);
        setExchanges(exchangeData || []);
      }).catch((error) => console.error(error)).finally(() => setLoading(false));
    }
  }, [currentUser?.id]);

  const score = Number(trustData?.trust_score ?? currentUser?.trust_score ?? 0);

  const completedExchanges = exchanges.filter((exchange: any) => exchange.status === 'COMPLETED').length;
  const receivedRequests = exchanges.filter((exchange: any) => Number(exchange.receiver_id) === Number(currentUser?.id));
  const answeredRequests = receivedRequests.filter((exchange: any) => exchange.status !== 'PENDING').length;
  const responseRate = receivedRequests.length ? Math.round((answeredRequests / receivedRequests.length) * 100) : Number(trustData?.response_rate ?? 0);
  const breakdown = [
    { title: 'Overall Trust Score', value: score, desc: 'Current score stored on your profile.' },
    { title: 'Reliability', value: Number(trustData?.reliability_score ?? 0), desc: 'Stored reliability metric based on exchange history and reviews.' },
    { title: 'Skill Quality', value: Number(trustData?.skill_quality_score ?? 0), desc: 'Stored skill-quality metric based on received reviews.' },
    { title: 'Response Rate', value: responseRate, desc: 'Share of received exchange requests that are no longer pending.' },
    { title: 'Completed Exchanges', value: completedExchanges, desc: 'Completed learning exchanges recorded for your account.' },
  ];

  const earnedBadges = new Set(Array.isArray(trustData?.badges) ? trustData.badges : []);
  const badges = [
    { name: 'Verified Member', desc: 'Profile verification has been approved.', earned: trustData?.verified === true },
    { name: 'Reliable Exchanger', desc: 'Earned from the trust engine after sustained reliable exchanges.', earned: earnedBadges.has('Reliable Exchanger') },
    { name: 'Top Contributor', desc: 'Earned from the trust engine after sustained high-quality activity.', earned: earnedBadges.has('Top Contributor') },
    { name: 'Community Helper', desc: 'Earned from the trust engine after contributing across multiple skill categories.', earned: earnedBadges.has('Community Helper') },
    { name: '10+ Successful Exchanges', desc: 'Earned after completing at least 10 exchanges.', earned: earnedBadges.has('10+ Successful Exchanges') },
  ];

  return (
    <AppPageShell eyebrow="Trust & reputation" title="Your community trust" description="A transparent view of your completed exchanges, reviews and trust factors." icon={<ShieldCheck className="h-3.5 w-3.5" />}>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#d31d24] uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" /> Algorithmic Trust Architecture
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
          Trust & Reputation System
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          In a zero-cash network, trust is the foundational currency. Your score is mathematically computed by the backend and cannot be faked or purchased.
        </p>
      </div>

      {/* Trust Gauge & Summary Card */}
      <Card className="p-8 bg-gradient-to-br from-white to-emerald-50/40 border-emerald-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <TrustScoreRing score={score} size="lg" />
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Current Community Reputation
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">Community reputation</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                Trust is built from completed exchanges, community reviews, response behaviour and exchange history.
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-4 sm:pt-0 sm:pl-8 shrink-0">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {currentUser?.completed_exchanges_count ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Completed Barters</span>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-2">
              {currentUser?.reviews_count ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Verified Reviews</span>
          </div>
        </div>
      </Card>

      {/* Explainable Factor Breakdown */}
      <Card className="p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Explainable Scoring Breakdown</h3>
          <p className="text-xs text-slate-500">Live metrics recorded from your account activity and completed exchanges</p>
        </div>

        <div className="space-y-4">
          {breakdown.map((item, i) => {
            const isCount = item.title === 'Completed Exchanges';
            const percentage = isCount ? Math.min(100, Number(item.value) * 10) : Math.min(100, Math.max(0, Number(item.value)));
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{item.title}</span>
                  <strong className="text-emerald-700 font-mono">{isCount ? item.value : `${Number(item.value).toFixed(0)} / 100`}</strong>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
            );
          })
        </div>
      </Card>


      <Card className="p-6">
        <div className="border-b border-[#e1e4e8] pb-3 mb-4"><h3 className="text-sm font-bold text-[#17233b]">Recent community reviews</h3><p className="text-xs text-slate-500">Feedback received from completed skill exchanges.</p></div>
        {loading ? <p className="py-8 text-center text-xs text-slate-400">Loading reviews…</p> : reviews.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No reviews yet. Complete exchanges to start building your reputation.</p> : <div className="divide-y divide-[#e1e4e8]">{reviews.slice(0,8).map((review:any)=><div key={review.id} className="flex gap-3 py-4"><img src={review.reviewer?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80'} alt="" className="h-9 w-9 rounded-full object-cover border border-[#e1e4e8]"/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#17233b]">{review.reviewer?.full_name || 'Community member'}</p><span className="text-xs font-bold text-[#d31d24]">★ {Number(review.rating).toFixed(1)}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{review.comment || 'Positive exchange feedback.'}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p></div></div>)}</div>}
      </Card>

      {/* Activity Badges Grid */}
      <Card className="p-6">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900">Activity & Verification Badges</h3>
          <p className="text-xs text-slate-500">Earned milestone badges displayed across your profile and proposals</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((b) => (
            <div
              key={b.name}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                b.earned
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${b.earned ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
                  {b.earned && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
    </AppPageShell>
  );
};
