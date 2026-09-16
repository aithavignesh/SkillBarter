import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Award, CheckCircle2, Flame, Heart, Link2, MessageCircle, PenLine, Share2, Sparkles, Target, UserPlus, Users, Bookmark, Send, ShieldCheck, CalendarDays, TrendingUp, Check, X } from 'lucide-react';

const key = (id: string | number | undefined, name: string) => `skillbarter_pro_${id || 'guest'}_${name}`;
const read = <T,>(name: string, fallback: T, id?: string | number) => { try { const value = localStorage.getItem(key(id, name)); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };

export const ProfessionalLayer: React.FC = () => {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const id = currentUser?.id;
  const offered = currentUser?.skills?.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name) || [];
  const needed = currentUser?.skills?.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name) || [];
  const name = currentUser?.full_name || 'SkillBarter Member';
  const [postText, setPostText] = useState('');
  const [posted, setPosted] = useState(() => read('posted', false, id));
  const [connected, setConnected] = useState(() => read('connected', false, id));
  const [liked, setLiked] = useState(false);
  const [streak, setStreak] = useState(() => read('streak', 3, id));
  const [saved, setSaved] = useState(() => read('saved', false, id));
  const [requestAction, setRequestAction] = useState<'pending' | 'accepted' | 'declined' | null>(null);
  const [exchangeStep, setExchangeStep] = useState(() => read('exchangeStep', 1, id));
  const [messageSent, setMessageSent] = useState(false);
  const [communityLiked, setCommunityLiked] = useState(false);
  const [workshopJoined, setWorkshopJoined] = useState(false);

  const completeness = useMemo(() => {
    const checks = [Boolean(name), Boolean(currentUser?.bio), offered.length > 0, needed.length > 0, Boolean(currentUser?.avatar_url)];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [name, currentUser?.bio, offered.length, needed.length, currentUser?.avatar_url]);

  if (pathname === '/feed') return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6 space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">{name.charAt(0).toUpperCase()}</div>
          <div className="flex-1"><input value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share a skill, learning update, project, or insight..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-100" /></div>
          <Button size="sm" onClick={() => { if (!postText.trim()) return; setPosted(true); localStorage.setItem(key(id, 'posted'), 'true'); setPostText(''); }}>Post</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-slate-500">
          <span className="px-2 py-1 rounded-lg bg-slate-50"><PenLine className="inline w-3 h-3 mr-1"/>Skill update</span>
          <span className="px-2 py-1 rounded-lg bg-slate-50"><Target className="inline w-3 h-3 mr-1"/>Learning goal</span>
          <span className="px-2 py-1 rounded-lg bg-slate-50"><Sparkles className="inline w-3 h-3 mr-1"/>Project insight</span>
        </div>
      </Card>
      {posted && <Card className="p-4">
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">{name.charAt(0).toUpperCase()}</div><div><p className="text-xs font-bold">{name}</p><p className="text-[10px] text-slate-400">Shared a learning update</p></div></div>
        <p className="text-xs mt-3">Your latest SkillBarter update is now visible in your activity.</p>
        <div className="flex gap-4 mt-3 text-[10px] text-slate-500"><button onClick={() => setLiked(!liked)}><Heart className={`inline w-3.5 h-3.5 mr-1 ${liked ? 'fill-current text-rose-500' : ''}`}/>{liked ? 'Liked' : 'Like'}</button><button><MessageCircle className="inline w-3.5 h-3.5 mr-1"/>Comment</button><button><Share2 className="inline w-3.5 h-3.5 mr-1"/>Share</button></div>
      </Card>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Flame className="w-4 h-4 text-orange-500"/><b className="text-xs">Learning Streak</b></div><div className="text-2xl font-black">{streak} days</div><p className="text-[10px] text-slate-500 mt-1">Keep your learning momentum going.</p><Button size="sm" className="mt-2" onClick={() => { const next = streak + 1; setStreak(next); localStorage.setItem(key(id, 'streak'), JSON.stringify(next)); }}>Log today</Button></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-amber-500"/><b className="text-xs">Skill Milestone</b></div><p className="text-xl font-black">{offered.length + needed.length}</p><p className="text-[10px] text-slate-500">skills in your learning network</p><div className="mt-2 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="inline w-3 h-3 mr-1"/>Next: complete an exchange</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-emerald-600"/><b className="text-xs">Network Growth</b></div><p className="text-[10px] text-slate-500">Connect with people who complement your skills.</p><Button size="sm" className="mt-2" onClick={() => { setConnected(!connected); localStorage.setItem(key(id, 'connected'), JSON.stringify(!connected)); }}><UserPlus className="inline w-3.5 h-3.5 mr-1"/>{connected ? 'Connected' : 'Connect with peers'}</Button></Card>
      </div>
    </div>
  );

  if (pathname.startsWith('/profile/')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600"/><b className="text-xs">Professional Profile Strength</b></div><p className="text-[10px] text-slate-500 mt-1">Complete your profile to improve discovery and AI matching.</p></div>
          <div className="w-full sm:w-48"><div className="flex justify-between text-[10px] font-bold mb-1"><span>{completeness}% complete</span><span>{completeness >= 80 ? 'Strong' : 'Improve'}</span></div><div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completeness}%` }}/></div></div>
          <Button size="sm">Improve profile</Button>
        </div>
      </Card>
    </div>
  );

  if (pathname.startsWith('/discover')) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-emerald-600"/><b className="text-xs">People who complement your skills</b></div><p className="text-[10px] text-slate-500 mt-1">Discover members who teach what you want to learn and may want what you offer.</p></div><div className="flex flex-wrap gap-1">{(needed.length ? needed : ['Web Development']).slice(0, 3).map((s: string) => <span key={s} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{s}</span>)}</div><Button size="sm" onClick={() => setConnected(true)}><UserPlus className="inline w-3.5 h-3.5 mr-1"/>Connect</Button></div></Card>
    </div>
  );

  if (pathname.startsWith('/connections')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600"/><b className="text-xs">Smart Network Suggestions</b></div><p className="text-[10px] text-slate-500 mt-1">Build your network with members whose skills complement your learning goals.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">{['AI & Machine Learning','Full Stack Development','Data Science'].map((skill, i) => <div key={skill} className="border border-slate-100 rounded-xl p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold">{String.fromCharCode(65 + i)}</div><div><b className="text-xs">Skill Mentor {i + 1}</b><p className="text-[9px] text-slate-400">{skill}</p></div></div><Button size="sm" className="w-full mt-2" onClick={() => setConnected(true)}><UserPlus className="inline w-3 h-3 mr-1"/>Connect</Button></div>)}</div></Card>
    </div>
  );

  if (pathname.startsWith('/matches')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600"/><b className="text-xs">AI Match Actions</b></div><p className="text-[10px] text-slate-500 mt-1">Review the match, connect, or start a skill exchange request.</p></div><span className="text-sm font-black text-emerald-700">92%</span></div><div className="grid sm:grid-cols-3 gap-2 mt-3"><div className="rounded-xl bg-emerald-50 p-3"><b className="text-[10px]">Skill overlap</b><p className="text-lg font-black">High</p></div><div className="rounded-xl bg-slate-50 p-3"><b className="text-[10px]">Trust</b><p className="text-lg font-black">Verified</p></div><div className="rounded-xl bg-slate-50 p-3"><b className="text-[10px]">Availability</b><p className="text-lg font-black">Flexible</p></div></div><div className="flex flex-wrap gap-2 mt-3"><Button size="sm" onClick={() => setConnected(true)}><UserPlus className="inline w-3.5 h-3.5 mr-1"/>{connected ? 'Connected' : 'Connect'}</Button><Button size="sm" variant="outline" onClick={() => setSaved(!saved)}><Bookmark className="inline w-3.5 h-3.5 mr-1"/>{saved ? 'Saved' : 'Save match'}</Button></div></Card>
    </div>
  );

  if (pathname.startsWith('/requests')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><Send className="w-4 h-4 text-emerald-600"/><b className="text-xs">Request Management</b></div><p className="text-[10px] text-slate-500 mt-1">Keep every skill exchange request clear and actionable.</p><div className="flex flex-wrap gap-2 mt-3"><Button size="sm" onClick={() => setRequestAction('pending')}><Send className="inline w-3.5 h-3.5 mr-1"/>{requestAction === 'pending' ? 'Request Sent' : 'Send Request'}</Button><Button size="sm" variant="outline" onClick={() => setRequestAction('accepted')}><Check className="inline w-3.5 h-3.5 mr-1"/>Accept</Button><Button size="sm" variant="outline" onClick={() => setRequestAction('declined')}><X className="inline w-3.5 h-3.5 mr-1"/>Decline</Button></div>{requestAction && <p className="text-[10px] font-semibold text-emerald-700 mt-3">Request status: {requestAction}</p>}</Card>
    </div>
  );

  if (pathname.startsWith('/exchanges')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600"/><b className="text-xs">Exchange Journey</b></div><p className="text-[10px] text-slate-500 mt-1">Track progress from scheduling to completion.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">{['Requested','Scheduled','In Progress','Completed'].map((step, i) => <button key={step} onClick={() => { const next = i + 1; setExchangeStep(next); localStorage.setItem(key(id, 'exchangeStep'), JSON.stringify(next)); }} className={`p-2 rounded-xl text-[10px] font-semibold text-left ${exchangeStep >= i + 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}><span className="block text-sm mb-1">{exchangeStep >= i + 1 ? '✓' : i + 1}</span>{step}</button>)}</div></Card>
    </div>
  );

  if (pathname.startsWith('/messages')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-600"/><b className="text-xs">Skill Exchange Chat Context</b></div><p className="text-[10px] text-slate-500 mt-1">Keep the conversation focused on the skill being exchanged.</p><div className="flex flex-wrap gap-2 mt-3"><span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{offered[0] || 'Skill mentoring'}</span><span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-600 text-[10px]">{needed[0] || 'Learning goal'}</span><Button size="sm" onClick={() => setMessageSent(true)}><Send className="inline w-3 h-3 mr-1"/>{messageSent ? 'Sent' : 'Send exchange invite'}</Button></div></Card>
    </div>
  );

  if (pathname.startsWith('/community')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600"/><b className="text-xs">Community Engagement</b></div><p className="text-[10px] text-slate-500 mt-1">Participate in skill communities and help useful posts reach more learners.</p><div className="flex gap-3 mt-3 text-[10px] text-slate-500"><button onClick={() => setCommunityLiked(!communityLiked)}><Heart className={`inline w-3.5 h-3.5 mr-1 ${communityLiked ? 'fill-current text-rose-500' : ''}`}/>{communityLiked ? 'Helpful' : 'Mark helpful'}</button><button><MessageCircle className="inline w-3.5 h-3.5 mr-1"/>Discuss</button><button><Share2 className="inline w-3.5 h-3.5 mr-1"/>Share</button><button><ShieldCheck className="inline w-3.5 h-3.5 mr-1"/>Report</button></div></Card>
    </div>
  );

  if (pathname.startsWith('/workshops')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-600"/><b className="text-xs">Workshop Engagement</b></div><p className="text-[10px] text-slate-500 mt-1">Turn workshops into an active learning journey.</p><div className="grid sm:grid-cols-3 gap-2 mt-3"><div className="rounded-xl bg-slate-50 p-3"><b className="text-[10px]">Recommended</b><p className="text-xs font-bold mt-1">AI Project Workshop</p></div><div className="rounded-xl bg-slate-50 p-3"><b className="text-[10px]">Your status</b><p className="text-xs font-bold mt-1">{workshopJoined ? 'Joined' : 'Not joined'}</p></div><Button size="sm" className="self-end" onClick={() => setWorkshopJoined(true)}>{workshopJoined ? 'Joined ✓' : 'Join workshop'}</Button></div></Card>
    </div>
  );

  if (pathname.startsWith('/membership')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-500"/><b className="text-xs">Premium Benefits Preview</b></div><div className="grid sm:grid-cols-3 gap-2 mt-3">{['Priority AI matching','Profile visibility boost','Advanced discovery'].map(item => <div key={item} className="rounded-xl bg-slate-50 p-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1"/><p className="text-[10px] font-semibold">{item}</p></div>)}</div></Card>
    </div>
  );

  if (pathname.startsWith('/activity')) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <Card className="p-4"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600"/><b className="text-xs">Professional Activity Insights</b></div><div className="grid grid-cols-3 gap-2 mt-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{exchangeStep - 1}</p><p className="text-[9px] text-slate-500">Exchange steps</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{completeness}%</p><p className="text-[9px] text-slate-500">Profile strength</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{connected ? '1' : '0'}</p><p className="text-[9px] text-slate-500">New connections</p></div></div></Card>
    </div>
  );

  return null;
};