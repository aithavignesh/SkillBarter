import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Compass, Users, Wrench, Repeat, ShieldCheck, TrendingUp, Sparkles, ArrowRight, MessageSquare, Heart, CalendarDays } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [postLoading, setPostLoading] = useState(true);
  useEffect(() => { api.getCommunityStats().then(setStats).catch(console.error).finally(() => setLoading(false)); api.getFeed().then(setPosts).catch(console.error).finally(() => setPostLoading(false)); }, []);
  const metrics = [
    ['Learners Nearby', stats?.members_nearby ?? stats?.posts ?? 0, Users],
    ['Skills Being Shared', stats?.skills_available ?? 0, Wrench],
    ['Learning Exchanges', stats?.exchanges_completed ?? stats?.exchanges ?? 0, Repeat],
    ['Average Trust', stats?.average_trust_score ? Number(stats.average_trust_score).toFixed(1) : '—', ShieldCheck],
  ] as const;
  return <AppPageShell eyebrow="Student community" title="Learn together. Share what you know." description="A live view of peer learning activity, useful skills and exchanges across the SkillBarter network." icon={<Compass className="h-3.5 w-3.5" />} actions={<Link to="/connections"><Button size="sm">View learning network</Button></Link>}>
    <div className="grid grid-cols-2 gap-px border border-[#e1e4e8] bg-[#e1e4e8] md:grid-cols-4">
      {metrics.map(([label, value, Icon]) => <div key={label} className="bg-white p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span><Icon className="h-4 w-4 text-[#d31d24]" /></div><p className="mt-3 text-2xl font-extrabold text-[#17233b]">{loading ? '—' : value}</p></div>)}
    </div>
    <div className="mt-5 grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] md:grid-cols-3">
      <section className="bg-white p-6"><TrendingUp className="h-5 w-5 text-[#d31d24]" /><h2 className="mt-3 font-bold text-[#17233b]">Find learning partners</h2><p className="mt-1 text-sm leading-6 text-slate-500">Find peers who can teach what you want to learn and discover students who can learn from you.</p><Link to="/discover"><Button className="mt-4" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>Discover</Button></Link></section>
      <section className="bg-white p-6"><Sparkles className="h-5 w-5 text-[#d31d24]" /><h2 className="mt-3 font-bold text-[#17233b]">Run a learning session</h2><p className="mt-1 text-sm leading-6 text-slate-500">Host a focused peer-learning session around a skill you can teach. Keep it practical, short and useful for students.</p><Link to="/workshops/create-workshop"><Button className="mt-4" size="sm">Create learning session</Button></Link></section>
      <section className="bg-white p-6"><Users className="h-5 w-5 text-[#d31d24]" /><h2 className="mt-3 font-bold text-[#17233b]">Build your learning network</h2><p className="mt-1 text-sm leading-6 text-slate-500">Meet peers around shared skills, projects and career goals.</p><Link to="/connections"><Button className="mt-4" size="sm">Open Learning Network</Button></Link></section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[#e1e4e8] bg-[#f7f8f7] px-5 py-4">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">Peer learning feed</div><h2 className="mt-1 text-sm font-bold text-[#17233b]">What learners are sharing</h2></div>
          <Link to="/feed"><Button size="sm" variant="outline">Open feed</Button></Link>
        </div>
        {postLoading ? <div className="p-8 text-center text-xs text-slate-400">Loading community activity…</div> : posts.length ? <div>{posts.slice(0,5).map((p:any)=><div key={p.id} className="border-b border-[#edf0f2] p-5 last:border-0"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">{p.post_type === 'WORKSHOP' ? <CalendarDays className="h-3.5 w-3.5"/> : <MessageSquare className="h-3.5 w-3.5"/>}{p.post_type === 'WORKSHOP' ? 'LEARNING SESSION' : 'PEER UPDATE'}</div><h3 className="mt-1 text-sm font-bold text-[#17233b]">{p.title || 'Peer learning update'}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{p.content}</p><div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3"/> {p.likes_count || 0}</span><span>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</span></div></div>)}</div> : <div className="p-8 text-center text-xs text-slate-400">No learning activity yet.</div>}
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d31d24]"/><h2 className="text-sm font-bold text-[#17233b]">Learning actions</h2></div>
        <div className="mt-4 space-y-2">
          <Link to="/discover" className="flex items-center justify-between border border-[#e1e4e8] bg-white px-4 py-3 text-xs font-semibold text-[#17233b] hover:bg-[#f7f8f7]"><span>Discover learning partners</span><ArrowRight className="h-3.5 w-3.5 text-[#d31d24]"/></Link>
          <Link to="/matches" className="flex items-center justify-between border border-[#e1e4e8] bg-white px-4 py-3 text-xs font-semibold text-[#17233b] hover:bg-[#f7f8f7]"><span>Find learning matches</span><ArrowRight className="h-3.5 w-3.5 text-[#d31d24]"/></Link>
          <Link to="/workshops" className="flex items-center justify-between border border-[#e1e4e8] bg-white px-4 py-3 text-xs font-semibold text-[#17233b] hover:bg-[#f7f8f7]"><span>Browse learning sessions</span><ArrowRight className="h-3.5 w-3.5 text-[#d31d24]"/></Link>
        </div>
      </Card>
    </div>
    </div>
  </AppPageShell>;
};
