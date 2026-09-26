import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PublicProfile, Review } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TrustScoreRing } from '../components/ui/TrustScoreRing';
import { RatingStars } from '../components/ui/RatingStars';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import {
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Repeat,
  ShieldCheck,
  MessageSquare,
  Flag,
  CheckCircle,
  Plus,
  Star
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, refreshUser } = useAuth();
  
  const targetId = id ? parseInt(id, 10) : currentUser?.id || 1;
  const isOwnProfile = currentUser?.id === targetId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Propose Modal
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState(false);

  // Add Skill Modal (for own profile)
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillType, setNewSkillType] = useState<'OFFERED' | 'NEEDED'>('OFFERED');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profData, revsData] = await Promise.all([
        api.getUserProfile(targetId),
        api.getUserReviews(targetId),
      ]);
      setProfile(profData);
      setReviews(revsData);
      if (currentUser && !isOwnProfile) {
        try { setIsBlocked(await api.isUserBlocked(targetId)); } catch { setIsBlocked(false); }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [targetId]);

  const handleAddSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      await api.addUserSkill({
        skill_name: newSkillName.trim(),
        skill_type: newSkillType,
        experience_level: 'Intermediate',
      });
      setNewSkillName('');
      setIsAddingSkill(false);
      await refreshUser();
      await loadProfile();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReport = async () => {
    const reason = prompt('Please describe why you are reporting this user to moderators:');
    if (!reason) return;
    try {
      await api.createReport({
        reported_user_id: targetId,
        category: 'Spam / Inappropriate',
        details: reason,
      });
      alert('Report submitted to community safety team.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBlock = async () => {
    const action = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(isBlocked ? 'Unblock this member so they can appear in your interactions again?' : 'Block this member? You will no longer receive messages or exchange interactions from them.')) return;
    try {
      setSafetyBusy(true);
      if (isBlocked) {
        await api.unblockUser(targetId);
        setIsBlocked(false);
      } else {
        await api.blockUser(targetId);
        setIsBlocked(true);
      }
    } catch (e: any) {
      alert(e.message || `Unable to ${action} this member.`);
    } finally {
      setSafetyBusy(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-slate-400">
        Loading peer profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
      {/* Profile Header Card */}
      <Card className="p-6 md:p-8 relative overflow-hidden border-slate-200/90 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <img
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={profile.full_name}
              className="w-20 h-20 rounded-full object-cover border-4 border-emerald-400 shadow-md shrink-0"
            />
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{profile.full_name}</h1>
              <p className="text-sm text-slate-600 mt-0.5">{profile.headline || 'Student & Peer Learner'}</p>

              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.address_display || 'Student / Learner'}
                  {profile.distance_display && ` (${profile.distance_display})`}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Trust Score Ring */}
          <div className="flex flex-col items-center shrink-0">
            <TrustScoreRing score={profile.trust_score} size="md" />
          </div>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {profile.badges?.map((b) => (
              <Badge key={b} variant="emerald" size="sm">
                ✓ {b}
              </Badge>
            ))}
          </div>

          {!isOwnProfile ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button size="sm" onClick={() => setIsProposeOpen(true)} icon={<Repeat className="w-3.5 h-3.5" />}>
                Start Learning Exchange
              </Button>
              <Link to="/messages">
                <Button size="sm" variant="outline" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                  Message Partner
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={handleReport} className="text-slate-400 hover:text-rose-600">
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Report</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBlock} disabled={safetyBusy} className="text-slate-400 hover:text-slate-900">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{safetyBusy ? 'Saving…' : isBlocked ? 'Unblock' : 'Block'}</span>
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsAddingSkill(!isAddingSkill)} icon={<Plus className="w-3.5 h-3.5" />}>
              Add Skills
            </Button>
          )}
        </div>

        {/* Quick Add Skill Form if Own Profile */}
        {isAddingSkill && (
          <form onSubmit={handleAddSkillSubmit} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-2 text-xs">
            <input
              type="text"
              placeholder="e.g. Python, React, AI / ML, Figma..."
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="w-full min-w-0 flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg"
              required
            />
            <select
              value={newSkillType}
              onChange={(e) => setNewSkillType(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="OFFERED">Skill I Offer</option>
              <option value="NEEDED">Skill I Need</option>
            </select>
            <Button type="submit" size="sm">Save</Button>
          </form>
        )}
      </Card>

      {/* About & Bio */}
      {profile.bio && (
        <Card className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">About</h3>
          <p className="text-xs text-slate-700 leading-relaxed">{profile.bio}</p>
        </Card>
      )}

      {/* Why this match matters */}
      {!isOwnProfile && (
        <Card className="p-6 bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200/80">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Why connect?</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Start with the skill you want to learn, then see what you can teach in return. A small, specific learning goal is enough for your first request.
          </p>
          <div className="mt-4 border border-emerald-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Good first request</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">“I’d like to learn one practical part of your skill, and I can help you with one of mine.”</p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">They can teach</p>
              <p className="text-xs font-semibold text-emerald-800 mt-1">{profile.skills_offered?.slice(0, 2).join(', ') || 'Skills listed on profile'}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">They want to learn</p>
              <p className="text-xs font-semibold text-teal-800 mt-1">{profile.skills_needed?.slice(0, 2).join(', ') || 'Learning goals'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Skills Offered & Skills Needed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offered */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">What I Can Teach</h3>
          </div>
          <div className="space-y-2">
            {profile.skills_offered?.length === 0 ? (
              <p className="text-xs text-slate-400">No teaching skills listed yet.</p>
            ) : (
              profile.skills_offered?.map((s) => (
                <div key={s} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950">{s}</span>
                  <span className="text-[10px] bg-white text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                    Can Teach
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Needed */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Repeat className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">What I Want to Learn</h3>
          </div>
          <div className="space-y-2">
            {profile.skills_needed?.length === 0 ? (
              <p className="text-xs text-slate-400">No learning goals listed yet.</p>
            ) : (
              profile.skills_needed?.map((s) => (
                <div key={s} className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-950">{s}</span>
                  <span className="text-[10px] bg-white text-teal-700 font-semibold px-2 py-0.5 rounded-md border border-teal-200">
                    Wants to Learn
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Peer Learning Reviews & Ratings Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Peer Learning Reviews</h3>
            <p className="text-xs text-slate-500">Feedback from completed skill exchanges</p>
          </div>
          <span className="text-xs font-bold text-slate-700">
            {reviews.length} Total Reviews
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-400">
            No reviews yet. Complete a skill exchange to build trust with your next learning partner!
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rev.reviewer?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                      alt={rev.reviewer?.full_name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-slate-900">{rev.reviewer?.full_name}</span>
                  </div>
                  <RatingStars value={rev.rating} size="sm" showScore />
                </div>

                {rev.comment && (
                  <p className="text-xs text-slate-700 italic">"{rev.comment}"</p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Reliability: {rev.reliability_score}/5 • Skill: {rev.skill_quality_score}/5</span>
                  <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Propose Exchange Modal */}
      <ProposeExchangeModal
        isOpen={isProposeOpen}
        onClose={() => setIsProposeOpen(false)}
        partner={profile}
        defaultPartnerSkill={profile.skills_offered?.[0] || ''}
        onSuccess={() => {
          alert('Exchange request sent successfully!');
        }}
      />
    </div>
  );
};
