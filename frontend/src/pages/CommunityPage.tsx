import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Compass, Users, Wrench, Repeat, ShieldCheck, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getCommunityStats().then(setStats).catch(console.error).finally(() => setLoading(false)); }, []);
  const metrics = [
    ['Members Nearby', stats?.members_nearby ?? stats?.posts ?? 0, Users],
    ['Skills Available', stats?.skills_available ?? 0, Wrench],
    ['Exchanges Completed', stats?.exchanges_completed ?? stats?.exchanges ?? 0, Repeat],
    ['Average Trust', stats?.average_trust_score ? Number(stats.average_trust_score).toFixed(1) : '—', ShieldCheck],
  ] as const;
  return <AppPageShell eyebrow="Community" title="Neighborhood community" description="A live overview of activity, skills and exchange momentum across your local SkillBarter network." icon={<Compass className="h-3.5 w-3.5" />} actions={<Link to="/connections"><Button size="sm">View connections</Button></Link>}>
    <div className="grid grid-cols-2 gap-px border border-[#e1e4e8] bg-[#e1e4e8] md:grid-cols-4">
      {metrics.map(([label, value, Icon]) => <div key={label} className="bg-white p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span><Icon className="h-4 w-4 text-[#d31d24]" /></div><p className="mt-3 text-2xl font-extrabold text-[#17233b]">{loading ? '—' : value}</p></div>)}
    </div>
    <div className="mt-5 grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] md:grid-cols-3">
      <section className="bg-white p-6"><TrendingUp className="h-5 w-5 text-[#d31d24]" /><h2 className="mt-3 font-bold text-[#17233b]">Discover skills</h2><p className="mt-1 text-sm leading-6 text-slate-500">Find people who can teach what you need and learn from your local network.</p><Link to="/discover"><Button className="mt-4" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>Discover</Button></Link></section>
      <section className="bg-white p-6"><Sparkles className="h-5 w-5 text-[#d31d24]" /><h2 className="mt-3 font-bold text-[#17233b]">Create a workshop</h2><p className="mt-1 text-sm leading-6 text-slate-500">Share a practical session with the community and turn your expertise into a local event.</p><Link to="/workshops/create-workshop"><Button className="mt-4" size="sm">Create workshop</Button></Link></section>
      <section className="bg-white p-6"><Users className="h-5 w-5 text-[#d31d24]" /><h2 className="mt-3 font-bold text-[#17233b]">Meet members</h2><p className="mt-1 text-sm leading-6 text-slate-500">Connect, message and build trusted skill relationships that lead to repeat exchanges.</p><Link to="/connections"><Button className="mt-4" size="sm">Connections</Button></Link></section>
    </div>
  </AppPageShell>;
};
