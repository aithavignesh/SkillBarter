import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { getMonetizationState } from '../services/monetization';
import { MapPin, MessageSquare, Plus, Repeat, Save, ShieldCheck, Sparkles, Trash2, UserPlus, BadgeCheck, Rocket, Crown } from 'lucide-react';

export const ProfileWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, refreshUser } = useAuth();
  const targetId = Number(id || currentUser?.id || 0);
  const own = Number(currentUser?.id) === targetId;
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'OFFERED' | 'NEEDED'>('OFFERED');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [monetizationTick, setMonetizationTick] = useState(0);

  const load = async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const [p, r] = await Promise.all([api.getUserProfile(targetId), api.getUserReviews(targetId)]);
      setProfile(p); setReviews(r);
      if (!own) { try { const status = await api.getConnectionStatus(targetId); setConnected(Boolean(status.connected)); } catch { setConnected(false); } }
    } catch (e: any) { setMessage(e?.message || 'Unable to load profile.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [targetId, own]);

  const offered = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'OFFERED'), [profile]);
  const needed = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'NEEDED'), [profile]);
  const monetization = useMemo(() => own ? getMonetizationState(targetId) : null, [own, targetId, monetizationTick]);
  const featured = Boolean(monetization?.featuredUntil && new Date(monetization.featuredUntil).getTime() > Date.now());

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMessage('');
      await api.updateMe({ full_name: profile.full_name, headline: profile.headline, bio: profile.bio, address_display: profile.address_display, availability: profile.availability, exchange_radius_km: profile.exchange_radius_km, primary_intent: profile.primary_intent });
      await refreshUser(); await load(); setEditing(false); setMessage('Profile saved successfully.');
    } catch (e: any) { setMessage(e?.message || 'Unable to save profile.'); }
    finally { setSaving(false); }
  };

  const addSkill = async (e: FormEvent) => {
    e.preventDefault(); if (!skillName.trim()) return;
    try { setSaving(true); await api.addUserSkill({ skill_name: skillName.trim(), skill_type: skillType, experience_level: 'Intermediate' }); setSkillName(''); await refreshUser(); await load(); setMessage('Skill added.'); }
    catch (e: any) { setMessage(e?.message || 'Unable to add skill.'); }
    finally { setSaving(false); }
  };

  const removeSkill = async (skillId: number) => {
    try { setSaving(true); await api.deleteUserSkill(skillId); await refreshUser(); await load(); setMessage('Skill removed.'); }
    catch (e: any) { setMessage(e?.message || 'Unable to remove skill.'); }
    finally { setSaving(false); }
  };

  const connect = async () => {
    try { setSaving(true); if (connected) await api.disconnectNeighbor(targetId); else await api.connectNeighbor(targetId); setConnected(!connected); setMessage(connected ? 'Connection removed.' : 'Connection created.'); }
    catch (e: any) { setMessage(e?.message || 'Unable to update connection.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-sm text-slate-400">Loading profile…</div>;
  if (!profile) return <div className="min-h-[70vh] flex items-center justify-center text-sm text-slate-500">Profile unavailable.</div>;

  return <AppPageShell eyebrow={own ? 'My profile' : 'Member profile'} title={profile.full_name || 'Profile'} description={profile.headline || 'SkillBarter community member'} icon={<ShieldCheck className="h-3.5 w-3.5" />} actions={own ? <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Close editor' : 'Edit profile'}</Button> : <div className="flex gap-2"><Button size="sm" onClick={() => setProposeOpen(true)} icon={<Repeat className="h-3.5 w-3.5" />}>Propose</Button><Button size="sm" variant="outline" onClick={connect} disabled={saving} icon={<UserPlus className="h-3.5 w-3.5" />}>{connected ? 'Disconnect' : 'Connect'}</Button><Link to={`/messages/${targetId}`}><Button size="sm" variant="outline" icon={<MessageSquare className="h-3.5 w-3.5" />}>Message</Button></Link></div>}>
    {message && <div className="mb-4 border border-[#e1e4e8] bg-white px-4 py-3 text-xs font-semibold text-[#17233b]">{message}</div>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_280px]">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <img src={profile.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160'} className="h-20 w-20 rounded-full border border-[#e1e4e8] object-cover" alt="" />
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold text-[#17233b]">{profile.full_name}</h2>{own && monetization?.premium && <span className="inline-flex items-center gap-1 border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]"><Crown className="h-3 w-3"/> Premium</span>}{own && monetization?.verified && <span className="inline-flex items-center gap-1 border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]"><BadgeCheck className="h-3 w-3"/> Verified</span>}{own && featured && <span className="inline-flex items-center gap-1 border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]"><Rocket className="h-3 w-3"/> Featured</span>}</div><p className="mt-1 text-sm text-[#697386]">{profile.headline || 'Community member'}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-[#697386]"><MapPin className="h-3.5 w-3.5 text-[#d31d24]" />{profile.address_display || 'Local neighborhood'}{profile.distance_display ? ` · ${profile.distance_display}` : ''}</p>{profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{profile.bio}</p>}</div>
            <div className="shrink-0 border border-[#e1e4e8] bg-[#f7f8f7] px-4 py-3 text-center"><div className="text-2xl font-black text-[#d31d24]">{Math.round(profile.trust_score || 0)}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trust / 100</div></div>
          </div>
        </Card>

        {editing && own && <Card className="p-5"><form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Full name<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600">Headline<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.headline || ''} onChange={e => setProfile({...profile, headline:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Bio<textarea className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" rows={4} value={profile.bio || ''} onChange={e => setProfile({...profile, bio:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600">Area<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.address_display || ''} onChange={e => setProfile({...profile, address_display:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600">Availability<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.availability || ''} onChange={e => setProfile({...profile, availability:e.target.value})} /></label><div className="sm:col-span-2"><Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save profile</Button></div></form></Card>}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Skills offered</h3></div><div className="space-y-2">{offered.length ? offered.map((s:any)=><div key={s.id} className="flex items-center justify-between border border-[#e1e4e8] bg-[#f7f8f7] px-3 py-2.5"><span className="text-xs font-bold text-[#17233b]">{s.skill_name}</span>{own && <button onClick={() => removeSkill(Number(s.id))} className="text-slate-400 hover:text-[#d31d24]" title="Remove skill"><Trash2 className="h-3.5 w-3.5" /></button>}</div>) : <p className="text-xs text-slate-400">No offered skills yet.</p>}</div></Card>
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Repeat className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Skills needed</h3></div><div className="space-y-2">{needed.length ? needed.map((s:any)=><div key={s.id} className="flex items-center justify-between border border-[#e1e4e8] bg-[#f7f8f7] px-3 py-2.5"><span className="text-xs font-bold text-[#17233b]">{s.skill_name}</span>{own && <button onClick={() => removeSkill(Number(s.id))} className="text-slate-400 hover:text-[#d31d24]" title="Remove skill"><Trash2 className="h-3.5 w-3.5" /></button>}</div>) : <p className="text-xs text-slate-400">No learning needs listed yet.</p>}</div></Card>
        </div>

        {own && <Card className="p-5"><div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Add a skill</h3></div><form onSubmit={addSkill} className="flex flex-col gap-2 sm:flex-row"><input value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="e.g. Python, Photography, Plumbing" className="h-10 flex-1 border border-[#d9dde2] bg-white px-3 text-xs" /><select value={skillType} onChange={e=>setSkillType(e.target.value as any)} className="h-10 border border-[#d9dde2] bg-white px-3 text-xs"><option value="OFFERED">I can teach</option><option value="NEEDED">I want to learn</option></select><Button type="submit" size="sm" disabled={saving || !skillName.trim()}>Add</Button></form></Card>}
      </div>

      <aside className="space-y-4"><Card className="p-5"><h3 className="text-sm font-bold text-[#17233b]">Trust signals</h3><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span className="text-slate-500">Reliability</span><b>{Math.round(profile.reliability_score || 0)}/100</b></div><div className="flex justify-between"><span className="text-slate-500">Response rate</span><b>{Math.round(profile.response_rate || 0)}%</b></div><div className="flex justify-between"><span className="text-slate-500">Completed exchanges</span><b>{profile.completed_exchanges_count || 0}</b></div><div className="flex justify-between"><span className="text-slate-500">Reviews</span><b>{profile.reviews_count || reviews.length}</b></div></div></Card><Card className="p-5"><h3 className="text-sm font-bold text-[#17233b]">Recent reviews</h3>{reviews.length ? <div className="mt-3 space-y-3">{reviews.slice(0,4).map((r:any)=><div key={r.id} className="border-b border-[#e1e4e8] pb-3 last:border-0"><div className="flex justify-between text-xs"><b>{r.reviewer?.full_name || 'Member'}</b><span className="text-[#d31d24]">★ {r.rating}/5</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{r.comment || 'Verified exchange feedback.'}</p></div>)}</div> : <p className="mt-3 text-xs text-slate-400">No reviews yet.</p>}</Card></aside>
    </div>
    {!own && <ProposeExchangeModal isOpen={proposeOpen} onClose={()=>setProposeOpen(false)} partner={profile} defaultPartnerSkill={profile.skills_offered?.[0] || ''} defaultMySkill={currentUser?.skills?.find(s=>s.skill_type==='OFFERED')?.skill_name || ''} onSuccess={()=>setMessage('Exchange proposal sent.')} />}
  </AppPageShell>;
};
