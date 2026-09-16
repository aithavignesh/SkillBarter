import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { Compass, Users, Wrench, Repeat, ShieldCheck, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.getCommunityStats().then(setStats).catch(()=>{}).finally(()=>setLoading(false));},[]);
  const metrics=[['Members Nearby',stats?.members_nearby??stats?.posts??0,Users],['Skills Available',stats?.skills_available??0,Wrench],['Exchanges Completed',stats?.exchanges_completed??stats?.exchanges??0,Repeat],['Average Trust',stats?.average_trust_score?Number(stats.average_trust_score).toFixed(1):'—',ShieldCheck]] as const;
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <div><span className="text-xs font-bold text-[#d31d24] uppercase tracking-wider flex items-center gap-1"><Compass className="w-4 h-4"/> Community</span><h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Neighborhood Community</h1><p className="text-sm text-slate-500 mt-1">Live activity across the SkillBarter community.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{metrics.map(([label,value,Icon])=><Card key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span><Icon className="w-4 h-4 text-[#d31d24]"/></div><div className="text-2xl font-extrabold text-slate-900 mt-3">{loading?'—':value}</div></Card>)}</div>
    <div className="grid gap-5 md:grid-cols-3"><Card className="p-6"><TrendingUp className="h-6 w-6 text-[#d31d24]"/><h2 className="mt-3 font-bold">Discover Skills</h2><p className="mt-1 text-sm text-slate-500">Find people who can teach what you need and learn from your local network.</p><Link to="/discover"><Button className="mt-4" size="sm" icon={<ArrowRight className="h-4 w-4"/>}>Discover</Button></Link></Card><Card className="p-6"><Sparkles className="h-6 w-6 text-[#d31d24]"/><h2 className="mt-3 font-bold">Create a Workshop</h2><p className="mt-1 text-sm text-slate-500">Share a practical session with the community.</p><Link to="/workshops/create-workshop"><Button className="mt-4" size="sm">Create workshop</Button></Link></Card><Card className="p-6"><Users className="h-6 w-6 text-[#d31d24]"/><h2 className="mt-3 font-bold">Meet Members</h2><p className="mt-1 text-sm text-slate-500">Connect, message and build trusted skill relationships.</p><Link to="/connections"><Button className="mt-4" size="sm">Connections</Button></Link></Card></div>
  </div>;
};
