import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { insforge } from '../lib/insforge';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { getMonetizationState } from '../services/monetization';
import {
  BadgeCheck, Camera, CheckCircle2, Crown, Edit3, ExternalLink, GraduationCap,
  Loader2, MapPin, MessageSquare, Plus, Repeat, Rocket, Save, ShieldCheck,
  Sparkles, Star, Trash2, UserPlus, Users, Briefcase, X
} from 'lucide-react';

const fallbackAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320';

export const LinkedInStyleProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, refreshUser } = useAuth();
  const targetId = Number(id || currentUser?.id || 0);
  const own = Number(currentUser?.id) === targetId;
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'OFFERED' | 'NEEDED'>('OFFERED');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const [p, r] = await Promise.all([api.getUserProfile(targetId), api.getUserReviews(targetId)]);
      setProfile(p); setReviews(Array.isArray(r) ? r : []);
      if (!own) {
        try { const status = await (api as any).getConnectionStatus(targetId); setConnected(Boolean(status?.connected)); }
        catch { setConnected(false); }
      }
    } catch (e: any) { setMessage(e?.message || 'Unable to load profile.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [targetId, own]);

  const offered = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'OFFERED'), [profile]);
  const needed = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'NEEDED'), [profile]);
  const monetization = useMemo(() => own ? getMonetizationState(targetId) : null, [own, targetId, avatarVersion]);
  const featured = Boolean(monetization?.featuredUntil && new Date(monetization.featuredUntil).getTime() > Date.now());
  const averageReview = reviews.length ? reviews.reduce((sum, r) => sum + Number(r.rating || r.score || 0), 0) / reviews.length : 0;

  const uploadAvatar = async (file?: File) => {
    if (!file || !own) return;
    if (!file.type.startsWith('image/')) { setMessage('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage('Profile picture must be 5 MB or smaller.'); return; }
    try {
      setUploading(true); setMessage('');
      const { data, error } = await insforge.storage.from('avatars').uploadAuto(file);
      if (error || !data?.url) throw new Error(error?.message || 'Unable to upload profile picture.');
      await api.updateMe({ avatar_url: data.url });
      setProfile((p: any) => ({ ...p, avatar_url: data.url }));
      await refreshUser(); setAvatarVersion(v => v + 1);
      setMessage('Profile picture updated.');
    } catch (e: any) { setMessage(e?.message || 'Unable to update profile picture.'); }
    finally { setUploading(false); }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMessage('');
      await api.updateMe({
        full_name: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        address_display: profile.address_display,
        availability: profile.availability,
        exchange_radius_km: profile.exchange_radius_km,
        primary_intent: profile.primary_intent,
      });
      await refreshUser(); await load(); setEditing(false); setMessage('Profile saved successfully.');
    } catch (e: any) { setMessage(e?.message || 'Unable to save profile.'); }
    finally { setSaving(false); }
  };

  const addSkill = async (e: FormEvent) => {
    e.preventDefault(); if (!skillName.trim()) return;
    try { setSaving(true); await api.addUserSkill({ skill_name: skillName.trim(), skill_type: skillType, experience_level: 'Intermediate' }); setSkillName(''); await load(); setMessage('Skill added.'); }
    catch (e: any) { setMessage(e?.message || 'Unable to add skill.'); }
    finally { setSaving(false); }
  };

  const removeSkill = async (skillId: number) => {
    try { setSaving(true); await api.deleteUserSkill(skillId); await load(); setMessage('Skill removed.'); }
    catch (e: any) { setMessage(e?.message || 'Unable to remove skill.'); }
    finally { setSaving(false); }
  };

  const toggleConnection = async () => {
    try { setSaving(true); if (connected) await api.disconnectNeighbor(targetId); else await api.connectNeighbor(targetId); setConnected(!connected); }
    catch (e: any) { setMessage(e?.message || 'Unable to update connection.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-sm text-slate-400">Loading profile…</div>;
  if (!profile) return <div className="min-h-[70vh] flex items-center justify-center text-sm text-slate-500">Profile unavailable.</div>;

  return <div className="min-h-screen bg-[#f3f2ef] pb-16">
    <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 lg:px-8">
      {message && <div className="mb-4 flex items-center justify-between border border-[#e1e4e8] bg-white px-4 py-3 text-xs font-semibold text-[#17233b] shadow-sm"><span>{message}</span><button onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div>}

      <section className="overflow-hidden border border-[#d9dfe6] bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#172b4d] via-[#24527a] to-[#d31d24] sm:h-40" />
        <div className="px-5 pb-5 sm:px-8">
          <div className="relative -mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              <img src={`${profile.avatar_url || fallbackAvatar}${profile.avatar_url?.includes('?') ? '&' : '?'}v=${avatarVersion}`} className="h-32 w-32 rounded-full border-4 border-white bg-white object-cover shadow-md sm:h-36 sm:w-36" alt={profile.full_name || 'Profile'} />
              {own && <button type="button" onClick={() => avatarInput.current?.click()} disabled={uploading} className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#d31d24] text-white shadow-md hover:bg-[#b8171d] disabled:opacity-60" title="Change profile picture"><Camera className="h-4 w-4" /></button>}
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { const f=e.target.files?.[0]; e.target.value=''; void uploadAvatar(f); }} />
              {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            </div>
            <div className="min-w-0 flex-1 pb-1 pt-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-[#17233b] sm:text-[28px]">{profile.full_name || 'SkillBarter Member'}</h1>
                {own && monetization?.premium && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0f0] px-2.5 py-1 text-[10px] font-bold text-[#b8171d]"><Crown className="h-3 w-3"/> Premium</span>}
                {own && monetization?.verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6ff] px-2.5 py-1 text-[10px] font-bold text-[#24527a]"><BadgeCheck className="h-3 w-3"/> Verified</span>}
                {own && featured && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e9] px-2.5 py-1 text-[10px] font-bold text-[#9b6b27]"><Rocket className="h-3 w-3"/> Featured</span>}
              </div>
              <p className="mt-1 text-base text-[#384860]">{profile.headline || 'SkillBarter community member'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#697386]"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{profile.address_display || 'Local community'}</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5"/>{profile.connections_count || 0} connections</span><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-[#d31d24]"/>{averageReview ? averageReview.toFixed(1) : 'New'} rating</span></div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">{own ? <Button size="sm" variant="outline" onClick={() => setEditing(!editing)} icon={<Edit3 className="h-3.5 w-3.5"/>}>{editing ? 'Close' : 'Edit profile'}</Button> : <><Button size="sm" onClick={() => setProposeOpen(true)} icon={<Repeat className="h-3.5 w-3.5"/>}>Propose exchange</Button><Button size="sm" variant="outline" onClick={toggleConnection} disabled={saving} icon={<UserPlus className="h-3.5 w-3.5"/>}>{connected ? 'Connected' : 'Connect'}</Button><Link to={`/messages/${targetId}`}><Button size="sm" variant="outline" icon={<MessageSquare className="h-3.5 w-3.5"/>}>Message</Button></Link></>}</div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <main className="space-y-4">
          {editing && own && <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Edit3 className="h-4 w-4 text-[#d31d24]"/><h2 className="text-base font-bold text-[#17233b]">Edit introduction</h2></div><form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#4f5d73]">Name<input className="mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm" value={profile.full_name || ''} onChange={e=>setProfile({...profile,full_name:e.target.value})}/></label><label className="text-xs font-semibold text-[#4f5d73]">Headline<input className="mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm" value={profile.headline || ''} onChange={e=>setProfile({...profile,headline:e.target.value})}/></label><label className="sm:col-span-2 text-xs font-semibold text-[#4f5d73]">About<textarea rows={5} className="mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm" value={profile.bio || ''} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label><label className="text-xs font-semibold text-[#4f5d73]">Location<input className="mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm" value={profile.address_display || ''} onChange={e=>setProfile({...profile,address_display:e.target.value})}/></label><label className="text-xs font-semibold text-[#4f5d73]">Availability<input className="mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm" value={profile.availability || ''} onChange={e=>setProfile({...profile,availability:e.target.value})}/></label><div className="sm:col-span-2"><Button type="submit" loading={saving} icon={<Save className="h-4 w-4"/>}>Save changes</Button></div></form></section>}

          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#17233b]">About</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4f5d73]">{profile.bio || 'Add a short introduction about your background, what you enjoy teaching, and what you want to learn through SkillBarter.'}</p></section>

          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#17233b]">Skills</h2><p className="mt-1 text-xs text-[#697386]">Your professional capabilities and learning goals.</p></div><Sparkles className="h-5 w-5 text-[#d31d24]"/></div><div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-[#697386]">Offering</h3><div className="mt-2 flex flex-wrap gap-2">{offered.length ? offered.map((s:any)=><span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-[#d9dfe6] bg-[#f7f9fb] px-3 py-1.5 text-xs font-semibold text-[#24354e]">{s.skill_name}{own && <button onClick={()=>removeSkill(Number(s.id))} className="text-slate-400 hover:text-[#d31d24]"><Trash2 className="h-3 w-3"/></button>}</span>) : <span className="text-xs text-slate-400">No offered skills yet.</span>}</div></div><div className="mt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-[#697386]">Looking to learn</h3><div className="mt-2 flex flex-wrap gap-2">{needed.length ? needed.map((s:any)=><span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-[#f0d5d6] bg-[#fff6f6] px-3 py-1.5 text-xs font-semibold text-[#8e242a]">{s.skill_name}{own && <button onClick={()=>removeSkill(Number(s.id))} className="text-slate-400 hover:text-[#d31d24]"><Trash2 className="h-3 w-3"/></button>}</span>) : <span className="text-xs text-slate-400">No learning goals yet.</span>}</div></div>{own && <form onSubmit={addSkill} className="mt-5 flex flex-col gap-2 border-t border-[#edf0f3] pt-4 sm:flex-row"><input value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="Add a skill" className="h-10 flex-1 border border-[#d9dfe6] px-3 text-xs"/><select value={skillType} onChange={e=>setSkillType(e.target.value as any)} className="h-10 border border-[#d9dfe6] px-3 text-xs"><option value="OFFERED">I can teach</option><option value="NEEDED">I want to learn</option></select><Button size="sm" type="submit" disabled={saving || !skillName.trim()} icon={<Plus className="h-3.5 w-3.5"/>}>Add</Button></form>}</section>

          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#d31d24]"/><h2 className="text-lg font-bold text-[#17233b]">Trust & reputation</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="border border-[#e1e4e8] bg-[#f8fafc] p-4"><p className="text-xs text-[#697386]">Trust score</p><p className="mt-1 text-2xl font-black text-[#d31d24]">{Math.round(profile.trust_score || 0)}<span className="text-sm font-semibold text-slate-400">/100</span></p></div><div className="border border-[#e1e4e8] bg-[#f8fafc] p-4"><p className="text-xs text-[#697386]">Reliability</p><p className="mt-1 text-2xl font-black text-[#17233b]">{Math.round(profile.reliability_score || 0)}%</p></div><div className="border border-[#e1e4e8] bg-[#f8fafc] p-4"><p className="text-xs text-[#697386]">Completed</p><p className="mt-1 text-2xl font-black text-[#17233b]">{profile.completed_exchanges || 0}</p></div></div>{reviews.length > 0 && <div className="mt-5 space-y-3">{reviews.slice(0,3).map((r:any,i)=><div key={r.id || i} className="border-t border-[#edf0f3] pt-3"><div className="flex items-center gap-1 text-[#d31d24]">{[1,2,3,4,5].map(n=><Star key={n} className={`h-3.5 w-3.5 ${n <= Number(r.rating || 0) ? 'fill-current' : ''}`}/>)}</div><p className="mt-2 text-sm text-[#4f5d73]">{r.comment || r.review || 'Positive exchange experience.'}</p></div>)}</div>}</section>
        </main>

        <aside className="space-y-4">
          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#17233b]">Profile highlights</h2><div className="mt-4 space-y-4"><div className="flex gap-3"><Briefcase className="mt-0.5 h-4 w-4 text-[#697386]"/><div><p className="text-xs font-bold text-[#17233b]">Open to skill exchange</p><p className="mt-1 text-xs text-[#697386]">{profile.primary_intent || 'Learning, teaching and collaboration'}</p></div></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#d31d24]"/><div><p className="text-xs font-bold text-[#17233b]">Availability</p><p className="mt-1 text-xs text-[#697386]">{profile.availability || 'Flexible'}</p></div></div><div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-[#697386]"/><div><p className="text-xs font-bold text-[#17233b]">Exchange area</p><p className="mt-1 text-xs text-[#697386]">Within {profile.exchange_radius_km || 10} km</p></div></div></div></section>
          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#17233b]">Why connect?</h2><p className="mt-2 text-xs leading-5 text-[#697386]">Connect when your skills and learning goals complement each other. SkillBarter is built for meaningful exchanges, not follower counts.</p>{!own && <div className="mt-4 grid gap-2"><Button size="sm" onClick={()=>setProposeOpen(true)} icon={<Repeat className="h-3.5 w-3.5"/>}>Start an exchange</Button><Link to={`/messages/${targetId}`}><Button size="sm" variant="outline" className="w-full" icon={<MessageSquare className="h-3.5 w-3.5"/>}>Send message</Button></Link></div>}</section>
          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#17233b]">SkillBarter profile</h2><div className="mt-4 space-y-3 text-xs text-[#697386]"><p className="flex items-center gap-2"><GraduationCap className="h-4 w-4"/> Learn from peers</p><p className="flex items-center gap-2"><Users className="h-4 w-4"/> Grow your local network</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Build trusted reputation</p></div></section>
        </aside>
      </div>
    </div>
    {proposeOpen && <ProposeExchangeModal targetUser={profile} onClose={()=>setProposeOpen(false)} onSuccess={()=>{setProposeOpen(false); setMessage('Exchange proposal sent.');}} />}
  </div>;
};

export default LinkedInStyleProfilePage;
