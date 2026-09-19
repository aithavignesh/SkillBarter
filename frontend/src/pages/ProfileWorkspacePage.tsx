import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { insforge } from '../lib/insforge';
import { useAuth } from '../context/AuthContext';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { getMonetizationState } from '../services/monetization';
import { MapPin, MessageSquare, Plus, Repeat, Save, ShieldCheck, Sparkles, Trash2, UserPlus, BadgeCheck, Rocket, Crown, Camera, Loader2, Users, Activity, CheckCircle2, PencilLine } from 'lucide-react';

export const ProfileWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, refreshUser } = useAuth();
  const targetId = Number(id || currentUser?.id || 0);
  const own = Number(currentUser?.id) === targetId;
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [connectionCount, setConnectionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'OFFERED' | 'NEEDED'>('OFFERED');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [monetizationTick, setMonetizationTick] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const [p, r, connections, posts, exchanges] = await Promise.all([
        api.getUserProfile(targetId), api.getUserReviews(targetId),
        insforge.database.from('connections').select('id').eq('status', 'ACCEPTED').or(`user_id.eq.${targetId},connected_user_id.eq.${targetId}`),
        insforge.database.from('posts').select('id,title,content,post_type,created_at').eq('author_id', targetId).order('created_at', { ascending: false }).limit(4),
        insforge.database.from('exchanges').select('id,status,created_at,updated_at').or(`requester_id.eq.${targetId},receiver_id.eq.${targetId}`).order('updated_at', { ascending: false }).limit(4),
      ]);
      if (connections.error) throw new Error(connections.error.message || 'Unable to load connections');
      if (posts.error) throw new Error(posts.error.message || 'Unable to load activity');
      if (exchanges.error) throw new Error(exchanges.error.message || 'Unable to load activity');
      setProfile(p); setReviews(r); setConnectionCount((connections.data || []).length);
      setActivity([...(posts.data || []).map((x:any)=>({...x, activity_type:'POST'})), ...(exchanges.data || []).map((x:any)=>({...x, activity_type:'EXCHANGE'}))].sort((a:any,b:any)=>new Date(b.updated_at || b.created_at).getTime()-new Date(a.updated_at || a.created_at).getTime()).slice(0,5));
      if (!own) { try { const status = await api.getConnectionStatus(targetId); setConnected(Boolean(status.connected)); } catch { setConnected(false); } }
    } catch (e: any) { setMessage(e?.message || 'Unable to load profile.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [targetId, own]);

  const offered = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'OFFERED'), [profile]);
  const needed = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'NEEDED'), [profile]);
  const monetization = useMemo(() => own ? getMonetizationState(targetId) : null, [own, targetId, monetizationTick]);
  const featured = Boolean(monetization?.featuredUntil && new Date(monetization.featuredUntil).getTime() > Date.now());
  const completenessItems = [Boolean(profile?.avatar_url), Boolean(profile?.headline), Boolean(profile?.bio), Boolean(profile?.address_display), offered.length > 0, needed.length > 0];
  const profileCompleteness = Math.round((completenessItems.filter(Boolean).length / completenessItems.length) * 100);
  const featuredSkills = offered.slice(0, 3);

  const uploadAvatar = async (file?: File) => {
    if (!file || !own) return;
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage('Profile pictures must be 5 MB or smaller.'); return; }
    try {
      setUploadingAvatar(true); setMessage('');
      const { data, error } = await insforge.storage.from('avatars').uploadAuto(file);
      if (error || !data?.url) throw new Error(error?.message || 'Unable to upload profile picture.');
      await api.updateMe({ avatar_url: data.url });
      setProfile((previous: any) => ({ ...previous, avatar_url: data.url }));
      await refreshUser();
      setMessage('Profile picture updated successfully.');
    } catch (e: any) {
      setMessage(e?.message || 'Unable to update profile picture.');
    } finally { setUploadingAvatar(false); }
  };

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
            <div className="relative shrink-0">
              <img src={profile.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160'} className="h-20 w-20 rounded-full border border-[#e1e4e8] object-cover" alt="Profile" />
              {own && <><button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#d31d24] text-white shadow-sm transition hover:bg-[#b8171d] disabled:cursor-not-allowed disabled:opacity-60" title="Change profile picture"><Camera className="h-3.5 w-3.5" /></button><input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void uploadAvatar(file); }} /></>}
              {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white"><Loader2 className="h-5 w-5 animate-spin" /></div>}
            </div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold text-[#17233b]">{profile.full_name}</h2>{own && monetization?.premium && <span className="inline-flex items-center gap-1 border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]"><Crown className="h-3 w-3"/> Premium</span>}{own && monetization?.verified && <span className="inline-flex items-center gap-1 border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]"><BadgeCheck className="h-3 w-3"/> Verified</span>}{own && featured && <span className="inline-flex items-center gap-1 border border-red-100 bg-[#fff5f5] px-2 py-1 text-[9px] font-bold uppercase text-[#b8171d]"><Rocket className="h-3 w-3"/> Featured</span>}</div><p className="mt-1 text-sm text-[#697386]">{profile.headline || 'Community member'}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-[#697386]"><MapPin className="h-3.5 w-3.5 text-[#d31d24]" />{profile.address_display || 'Local neighborhood'}{profile.distance_display ? ` · ${profile.distance_display}` : ''}</p>{profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{profile.bio}</p>}</div>
            <div className="shrink-0 border border-[#e1e4e8] bg-[#f7f8f7] px-4 py-3 text-center"><div className="text-2xl font-black text-[#d31d24]">{Math.round(profile.trust_score || 0)}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trust / 100</div></div>
          </div>
        </Card>

        {editing && own && <Card className="p-5"><form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Full name<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600">Headline<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.headline || ''} onChange={e => setProfile({...profile, headline:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Bio<textarea className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" rows={4} value={profile.bio || ''} onChange={e => setProfile({...profile, bio:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600">Area<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.address_display || ''} onChange={e => setProfile({...profile, address_display:e.target.value})} /></label><label className="text-xs font-semibold text-slate-600">Availability<input className="mt-1 w-full border border-[#d9dde2] bg-white px-3 py-2.5 text-xs" value={profile.availability || ''} onChange={e => setProfile({...profile, availability:e.target.value})} /></label><div className="sm:col-span-2"><Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save profile</Button></div></form></Card>}

        <Card className="p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">Profile strength</div><h3 className="mt-1 text-sm font-bold text-[#17233b]">Build a stronger member profile</h3></div><span className="text-xl font-black text-[#d31d24]">{profileCompleteness}%</span></div><div className="mt-3 h-2 bg-[#e6e8eb]"><div className="h-full bg-[#d31d24]" style={{ width: profileCompleteness + "%" }} /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{completenessItems.map((done:any, index:number)=><div key={index} className={"flex items-center gap-2 border px-3 py-2 text-[10px] font-semibold " + (done ? "border-green-100 bg-green-50 text-green-700" : "border-[#e1e4e8] bg-white text-slate-500")}>{done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}<span>{["Photo","Headline","About","Area","Offered skills","Learning goals"][index]}</span></div>)}</div></Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Skills offered</h3></div><div className="space-y-2">{offered.length ? offered.map((s:any)=><div key={s.id} className="flex items-center justify-between border border-[#e1e4e8] bg-[#f7f8f7] px-3 py-2.5"><span className="text-xs font-bold text-[#17233b]">{s.skill_name}</span>{own && <button onClick={() => removeSkill(Number(s.id))} className="text-slate-400 hover:text-[#d31d24]" title="Remove skill"><Trash2 className="h-3.5 w-3.5" /></button>}</div>) : <p className="text-xs text-slate-400">No offered skills yet.</p>}</div></Card>
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Repeat className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Skills needed</h3></div><div className="space-y-2">{needed.length ? needed.map((s:any)=><div key={s.id} className="flex items-center justify-between border border-[#e1e4e8] bg-[#f7f8f7] px-3 py-2.5"><span className="text-xs font-bold text-[#17233b]">{s.skill_name}</span>{own && <button onClick={() => removeSkill(Number(s.id))} className="text-slate-400 hover:text-[#d31d24]" title="Remove skill"><Trash2 className="h-3.5 w-3.5" /></button>}</div>) : <p className="text-xs text-slate-400">No learning needs listed yet.</p>}</div></Card>
        </div>

        {own && <Card className="p-5"><div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Add a skill</h3></div><form onSubmit={addSkill} className="flex flex-col gap-2 sm:flex-row"><input value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="e.g. Python, Photography, Plumbing" className="h-10 flex-1 border border-[#d9dde2] bg-white px-3 text-xs" /><select value={skillType} onChange={e=>setSkillType(e.target.value as any)} className="h-10 border border-[#d9dde2] bg-white px-3 text-xs"><option value="OFFERED">I can teach</option><option value="NEEDED">I want to learn</option></select><Button type="submit" size="sm" disabled={saving || !skillName.trim()}>Add</Button></form></Card>}
      </div>

      <aside className="space-y-4"><Card className="p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-[#17233b]">Network</h3><Users className="h-4 w-4 text-[#d31d24]" /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="border border-[#e1e4e8] bg-[#f7f8f7] p-3"><div className="text-xl font-black text-[#17233b]">{connectionCount}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connections</div></div><div className="border border-[#e1e4e8] bg-[#f7f8f7] p-3"><div className="text-xl font-black text-[#d31d24]">{profile.completed_exchanges_count || 0}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exchanges</div></div></div></Card>{featuredSkills.length > 0 && <Card className="p-5"><h3 className="text-sm font-bold text-[#17233b]">Featured skills</h3><div className="mt-3 space-y-2">{featuredSkills.map((s:any)=><div key={s.id} className="border-l-2 border-[#d31d24] bg-[#f7f8f7] px-3 py-2"><div className="text-xs font-bold text-[#17233b]">{s.skill_name}</div><div className="text-[10px] text-slate-400">{s.experience_level || "Intermediate"} · Can teach</div></div>)}</div></Card>}<Card className="p-5"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#d31d24]" /><h3 className="text-sm font-bold text-[#17233b]">Recent activity</h3></div>{activity.length ? <div className="mt-3 space-y-3">{activity.map((item:any)=><div key={item.activity_type + item.id} className="border-l border-[#e1e4e8] pl-3"><div className="text-[10px] font-bold uppercase text-slate-400">{item.activity_type === "POST" ? "Community post" : "Exchange"}</div><div className="mt-1 text-xs font-semibold text-[#17233b]">{item.activity_type === "POST" ? (item.title || item.content?.slice(0,80) || "Shared an update") : String(item.status || "Updated").replace("_"," ")}</div><div className="mt-1 text-[10px] text-slate-400">{new Date(item.updated_at || item.created_at).toLocaleDateString()}</div></div>)}</div> : <p className="mt-3 text-xs text-slate-400">No recent activity yet.</p>}</Card><Card className="p-5"><h3 className="text-sm font-bold text-[#17233b]">Trust signals</h3><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span className="text-slate-500">Reliability</span><b>{Math.round(profile.reliability_score || 0)}/100</b></div><div className="flex justify-between"><span className="text-slate-500">Response rate</span><b>{Math.round(profile.response_rate || 0)}%</b></div><div className="flex justify-between"><span className="text-slate-500">Completed exchanges</span><b>{profile.completed_exchanges_count || 0}</b></div><div className="flex justify-between"><span className="text-slate-500">Reviews</span><b>{profile.reviews_count || reviews.length}</b></div></div></Card><Card className="p-5"><h3 className="text-sm font-bold text-[#17233b]">Recent reviews</h3>{reviews.length ? <div className="mt-3 space-y-3">{reviews.slice(0,4).map((r:any)=><div key={r.id} className="border-b border-[#e1e4e8] pb-3 last:border-0"><div className="flex justify-between text-xs"><b>{r.reviewer?.full_name || 'Member'}</b><span className="text-[#d31d24]">★ {r.rating}/5</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{r.comment || 'Verified exchange feedback.'}</p></div>)}</div> : <p className="mt-3 text-xs text-slate-400">No reviews yet.</p>}</Card></aside>
    </div>
    {!own && <ProposeExchangeModal isOpen={proposeOpen} onClose={()=>setProposeOpen(false)} partner={profile} defaultPartnerSkill={profile.skills_offered?.[0] || ''} defaultMySkill={currentUser?.skills?.find(s=>s.skill_type==='OFFERED')?.skill_name || ''} onSuccess={()=>setMessage('Exchange proposal sent.')} />}
  </AppPageShell>;
};