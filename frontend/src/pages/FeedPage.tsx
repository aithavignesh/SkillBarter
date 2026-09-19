import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Post, MatchResult, UserSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TrustScoreRing } from '../components/ui/TrustScoreRing';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import {
  Sparkles,
  MapPin,
  Heart,
  Repeat,
  Plus,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Users, BadgeCheck, Crown
} from 'lucide-react';

export const FeedPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // New Post Form State
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'OFFER' | 'REQUEST'>('OFFER');
  const [postSkill, setPostSkill] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Propose Modal State
  const [selectedPartner, setSelectedPartner] = useState<UserSummary | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [defaultPartnerSkill, setDefaultPartnerSkill] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [feedData, matchData] = await Promise.all([
        api.getFeed(activeFilter !== 'ALL' ? activeFilter : undefined),
        api.getMatches()
      ]);
      setPosts(feedData);
      setMatches(matchData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    try {
      setIsPosting(true);
      await api.createPost({
        post_type: postType,
        title: postTitle.trim(),
        content: postContent.trim(),
        skill_name: postSkill.trim() || undefined
      });
      setPostTitle('');
      setPostContent('');
      setPostSkill('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const res = await api.likePost(postId);
      setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: res.likes_count } : p));
    } catch (e) {
      console.error(e);
    }
  };

  const openProposeModal = (partner: UserSummary, skillName?: string) => {
    setSelectedPartner(partner);
    setDefaultPartnerSkill(skillName || '');
    setIsProposeOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Profile & Trust Summary */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-5 overflow-hidden">
            {/* User Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                <img
                  src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser?.full_name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#d31d24] shadow-md"
                />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{currentUser?.full_name}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{currentUser?.headline || 'Community Member'}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                <MapPin className="w-3 h-3 text-[#d31d24]" />
                <span>{currentUser?.address_display || 'Hyderabad'}</span>
              </div>
            </div>

            {/* Trust Ring */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center">
              <TrustScoreRing score={currentUser?.trust_score || 94} size="md" />
            </div>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap justify-center gap-1">
              {(currentUser?.badges || ['Verified Member']).map((b) => (
                <span key={b} className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full border border-slate-200">
                  {b}
                </span>
              ))}
            </div>

            {/* Skills Offered / Needed Summary */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-left">
              <div>
                <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-1">
                  You Offer:
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => (
                    <span key={s.id} className="text-[11px] bg-red-50 text-[#9f171c] px-2 py-0.5 rounded-md font-medium">
                      {s.skill_name}
                    </span>
                  )) || <span className="text-slate-400">No skills listed</span>}
                </div>
              </div>

              <div className="pt-2">
                <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-1">
                  You Need:
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentUser?.skills?.filter(s => s.skill_type === 'NEEDED').map(s => (
                    <span key={s.id} className="text-[11px] bg-slate-100 text-[#17233b] px-2 py-0.5 rounded-md font-medium">
                      {s.skill_name}
                    </span>
                  )) || <span className="text-slate-400">No skills listed</span>}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <Link to={`/profile/${currentUser?.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Full Profile
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* CENTER COLUMN: Feed & Post Creation */}
        <div className="lg:col-span-6 space-y-4">
          {/* Post Creation Box */}
          <Card className="p-4">
            <form onSubmit={handleCreatePost} className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPostType('OFFER')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    postType === 'OFFER'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Offer a Skill
                </button>
                <button
                  type="button"
                  onClick={() => setPostType('REQUEST')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    postType === 'REQUEST'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Request Help
                </button>
              </div>

              <input
                type="text"
                placeholder={postType === 'OFFER' ? "What can you teach other students?" : "What do you want to learn?"}
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />

              <textarea
                rows={2}
                placeholder="Share what you want to practice, build, or exchange with a peer..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                required
              />

              <div className="flex items-center justify-between pt-1">
                <input
                  type="text"
                  placeholder="Tag a skill (e.g. React, Python)..."
                  value={postSkill}
                  onChange={(e) => setPostSkill(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg max-w-[180px]"
                />
                <Button type="submit" size="sm" loading={isPosting} icon={<Send className="w-3.5 h-3.5" />}>
                  Share with Learners
                </Button>
              </div>
            </form>
          </Card>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Community:</span>
            </div>
            <div className="flex gap-1">
              {[
                { id: 'ALL', label: 'All Updates' },
                { id: 'OFFER', label: 'Offers' },
                { id: 'REQUEST', label: 'Requests' },
                { id: 'COMPLETED_EXCHANGE', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading peer-learning updates...
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              No updates yet. Be the first to share a skill or ask for help!
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-5 space-y-3">
                {/* Author Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                      alt={post.author?.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/profile/${post.author?.id}`} className="text-xs font-bold text-[#17233b] hover:text-[#d31d24]">
                          {post.author?.full_name}
                        </Link>
                        {post.author?.verified && <BadgeCheck className="h-3.5 w-3.5 text-[#d31d24]" />}
                        {post.author?.premium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        {post.author?.featured && <span className="text-[9px] font-bold uppercase tracking-wider text-[#d31d24]">Featured</span>}
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          ★ {Math.round(post.author?.trust_score || 90)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {post.distance_display && (
                          <span className="font-semibold text-[#d31d24]">
                            {post.distance_display}
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      post.post_type === 'OFFER'
                        ? 'emerald'
                        : post.post_type === 'REQUEST'
                        ? 'blue'
                        : 'purple'
                    }
                    size="sm"
                  >
                    {post.post_type.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Content */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">{post.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{post.content}</p>
                </div>

                {/* Skill tag */}
                {post.skill && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    <Sparkles className="w-3 h-3 text-[#d31d24]" />
                    <span>Skill: {post.skill.name}</span>
                  </div>
                )}

                {/* Footer / Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className="flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors"
                  >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                    <span>{post.likes_count} Likes</span>
                  </button>

                  {post.author?.id !== currentUser?.id && (
                    <Button
                      size="sm"
                      onClick={() => openProposeModal(post.author, post.skill?.name)}
                      icon={<Repeat className="w-3.5 h-3.5" />}
                    >
                      Start Exchange
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: Reciprocal Matches & Hyperlocal Activity */}
        <div className="lg:col-span-3 space-y-4">
          {/* Top Skill Matches Widget */}
          <Card className="p-4 bg-gradient-to-br from-white to-emerald-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#d31d24] animate-pulse" />
                <h3 className="text-xs font-bold text-slate-900">People Who Match Your Learning Goals</h3>
              </div>
              <Link to="/matches" className="text-[11px] font-semibold text-emerald-700 hover:underline">
                View all
              </Link>
            </div>

            {matches.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Add more skills to discover peers who can teach what you want to learn.
              </p>
            ) : (
              <div className="space-y-3">
                {matches.slice(0, 3).map((match, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={match.candidate?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'}
                          alt={match.candidate?.full_name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {match.candidate?.full_name}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        {match.match_score}% Match
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 mb-2">
                      <p className="truncate">
                        <strong>They can teach:</strong> {match.they_offer?.join(', ') || 'Skills'}
                      </p>
                      <p className="text-emerald-700 font-semibold"><span className="block">{match.distance_display}</span><span className="block text-slate-500 mt-0.5">Skill match • peer learning</span></p>
                    </div>

                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openProposeModal(match.candidate, match.they_offer?.[0])}
                      icon={<Repeat className="w-3 h-3" />}
                    >
                      Start Exchange
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Zero Cash Principle Box */}
          <Card className="p-4 bg-slate-900 text-white">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>SkillBarter Covenant</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              "No currency. No prices. No middleman cuts. Pure skill reciprocity governed by community trust."
            </p>
            <Link to="/trust" className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              Learn how trust score works <ArrowRight className="w-3 h-3" />
            </Link>
          </Card>
        </div>
      </div>

      {/* Propose Exchange Modal */}
      {selectedPartner && (
        <ProposeExchangeModal
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          partner={selectedPartner}
          defaultPartnerSkill={defaultPartnerSkill}
          onSuccess={() => {
            alert('Skill barter proposal sent! Redirecting to your exchanges.');
            navigate('/exchanges');
          }}
        />
      )}
    </div>
  );
};
