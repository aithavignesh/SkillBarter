import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { insforge } from '../lib/insforge';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ProposeExchangeModal } from '../components/exchange/ProposeExchangeModal';
import { Modal } from '../components/ui/Modal';
import { getMonetizationState } from '../services/monetization';
import {
  BadgeCheck, Camera, CheckCircle2, Crown, Edit3, ExternalLink, GraduationCap,
  Loader2, MapPin, MessageSquare, Plus, Repeat, Rocket, Save, ShieldCheck,
  Sparkles, Star, Trash2, UserPlus, Users, Briefcase, X, Upload, ImagePlus, Trash2 as RemovePhoto, Flag, ShieldOff
} from 'lucide-react';

export const LinkedInStyleProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const targetId = Number(id || currentUser?.id || 0);
  const own = Number(currentUser?.id) === targetId;
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportNotice, setReportNotice] = useState('');
  const [message, setMessage] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'OFFERED' | 'NEEDED'>('OFFERED');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cameraButtonRef = useRef<HTMLButtonElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);
  const [photoActionsOpen, setPhotoActionsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  const load = async () => {
    if (!targetId) {
      setLoading(false);
      setLoadError(false);
      setProfile(null);
      return;
    }
    let mounted = true;
    try {
      setLoading(true);
      setLoadError(false);
      setMessage('');
      const [p, r] = await Promise.all([api.getUserProfile(targetId), api.getUserReviews(targetId)]);
      if (!mounted) return;
      setProfile(p); setReviews(Array.isArray(r) ? r : []);
      if (!own) {
        try {
          const status = await (api as any).getConnectionStatus(targetId);
          if (mounted) setConnected(Boolean(status?.connected));
        } catch {
          if (mounted) setConnected(false);
        }
        try {
          const status = await (api as any).getBlockStatus?.(targetId);
          if (mounted) setBlocked(Boolean(status));
        } catch {
          if (mounted) setBlocked(false);
        }
      }
    } catch (e: any) {
      if (mounted) {
        setProfile(null);
        setReviews([]);
        setLoadError(true);
        setMessage('');
      }
    } finally {
      if (mounted) setLoading(false);
      mounted = false;
    }
  };

  useEffect(() => { void load(); }, [targetId, own]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profile?.avatar_url]);

  const offered = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'OFFERED'), [profile]);
  const needed = useMemo(() => (profile?.skills || []).filter((s: any) => s.skill_type === 'NEEDED'), [profile]);
  const monetization = useMemo(() => own ? getMonetizationState(targetId) : null, [own, targetId, avatarVersion]);
  const featured = Boolean(monetization?.featuredUntil && new Date(monetization.featuredUntil).getTime() > Date.now());
  const averageReview = reviews.length ? reviews.reduce((sum, r) => sum + Number(r.rating || r.score || 0), 0) / reviews.length : 0;
  const completionItems = useMemo(() => [
    { label: 'Photo', complete: Boolean(profile?.avatar_url) },
    { label: 'Headline', complete: Boolean(profile?.headline?.trim()) },
    { label: 'About', complete: Boolean(profile?.bio?.trim()) },
    { label: 'Location', complete: Boolean(profile?.address_display?.trim()) },
    { label: 'Offered skill', complete: offered.length > 0 },
    { label: 'Learning goal', complete: needed.length > 0 },
  ], [profile, offered.length, needed.length]);
  const profileCompletion = Math.round((completionItems.filter(item => item.complete).length / completionItems.length) * 100);
  const missingCompletionItems = completionItems.filter(item => !item.complete);
  const orientationStorageKey = `skillbarter:first-time-orientation:${targetId}`;
  const [showOrientation, setShowOrientation] = useState(false);

  useEffect(() => {
    setShowOrientation(
      own &&
      profileCompletion === 100 &&
      window.localStorage.getItem(orientationStorageKey) !== 'completed',
    );
  }, [own, profileCompletion, orientationStorageKey]);

  const continueFromCompletion = () => {
    window.localStorage.setItem(orientationStorageKey, 'completed');
    setShowOrientation(false);
    navigate('/matches');
  };

  const initials = (profile?.full_name || currentUser?.full_name || 'SkillBarter Member')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  const openPhotoMenu = useCallback(() => {
    if (!cameraButtonRef.current) return;
    const rect = cameraButtonRef.current.getBoundingClientRect();
    const menuWidth = 224; // w-56 = 14rem = 224px
    // Place below the button; clamp to viewport width
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
    const top = rect.bottom + 8;
    setMenuPos({ top, left });
    setPhotoActionsOpen(true);
  }, []);

  const closePhotoMenu = useCallback(() => {
    setPhotoActionsOpen(false);
    setMenuPos(null);
  }, []);

  const togglePhotoMenu = useCallback(() => {
    if (photoActionsOpen) {
      closePhotoMenu();
    } else {
      openPhotoMenu();
    }
  }, [photoActionsOpen, openPhotoMenu, closePhotoMenu]);

  // Close on scroll or resize (menu position would be stale)
  useEffect(() => {
    if (!photoActionsOpen) return;
    const handleClose = () => closePhotoMenu();
    window.addEventListener('scroll', handleClose, { capture: true, passive: true });
    window.addEventListener('resize', handleClose, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleClose, { capture: true });
      window.removeEventListener('resize', handleClose);
    };
  }, [photoActionsOpen, closePhotoMenu]);

  // Click-outside to close
  useEffect(() => {
    if (!photoActionsOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node) &&
        cameraButtonRef.current && !cameraButtonRef.current.contains(e.target as Node)
      ) {
        closePhotoMenu();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [photoActionsOpen, closePhotoMenu]);

  const choosePhoto = () => {
    closePhotoMenu();
    avatarInput.current?.click();
  };

  const handlePhotoSelected = (file?: File) => {
    if (!file || !own) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Profile pictures must be 5 MB or smaller.');
      return;
    }
    setCropFile(file);
    setCropPreviewUrl(URL.createObjectURL(file));
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
    setPhotoActionsOpen(false);
    setMessage('');
  };

  const cancelCrop = () => {
    if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
    setCropPreviewUrl('');
    setCropFile(null);
  };

  const cropSelectedImage = async (): Promise<File> => {
    if (!cropFile || !cropPreviewUrl) throw new Error('Please choose an image first.');
    const image = new Image();
    image.src = cropPreviewUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to preview this image.'));
    });

    const outputSize = 640;
    const scale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight) * cropZoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const maxX = Math.max(0, (width - outputSize) / 2);
    const maxY = Math.max(0, (height - outputSize) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare this image.');
    context.fillStyle = '#f7f7f5';
    context.fillRect(0, 0, outputSize, outputSize);
    context.drawImage(
      image,
      (outputSize - width) / 2 + (cropX / 100) * maxX,
      (outputSize - height) / 2 + (cropY / 100) * maxY,
      width,
      height,
    );
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Unable to prepare this image.');
    return new File([blob], `${cropFile.name.replace(/\.[^.]+$/, '') || 'profile-photo'}.jpg`, { type: 'image/jpeg' });
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !own) return;
    try {
      setUploading(true); setMessage('');
      const { data, error } = await insforge.storage.from('avatars').uploadAuto(file);
      if (error || !data?.url) throw new Error(error?.message || 'Unable to upload profile picture.');
      await api.updateMe({ avatar_url: data.url });
      setProfile((p: any) => ({ ...p, avatar_url: data.url }));
      setAvatarLoadError(false);
      await refreshUser(); setAvatarVersion(v => v + 1);
      setMessage('Profile picture updated.');
    } catch (e: any) { setMessage(e?.message || 'Unable to update profile picture.'); }
    finally { setUploading(false); }
  };

  const saveCroppedPhoto = async () => {
    try {
      const croppedFile = await cropSelectedImage();
      await uploadAvatar(croppedFile);
      cancelCrop();
    } catch (e: any) {
      setMessage(e?.message || 'Unable to prepare this image.');
    }
  };

  const removePhoto = async () => {
    if (!own || !profile?.avatar_url) return;
    try {
      setUploading(true);
      setMessage('');
      await api.updateMe({ avatar_url: '' });
      setProfile((previous: any) => ({ ...previous, avatar_url: undefined }));
      await refreshUser();
      setAvatarVersion(v => v + 1);
      closePhotoMenu();
      setMessage('Profile picture removed.');
    } catch (e: any) {
      setMessage(e?.message || 'Unable to remove profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleReport = async (event: FormEvent) => {
    event.preventDefault();
    const details = reportDetails.trim();
    if (!details) {
      setReportError('Describe what happened so the safety team can review it.');
      return;
    }
    try {
      setReportSending(true);
      setReportError('');
      await api.createReport({
        reported_user_id: targetId,
        category: 'Spam / Inappropriate',
        details,
      });
      setReportDialogOpen(false);
      setReportDetails('');
      setReportNotice('Your report was sent to the community safety team.');
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Unable to submit this report.');
    } finally {
      setReportSending(false);
    }
  };

  const handleBlockToggle = async () => {
    if (blocking) return;
    try {
      setBlocking(true);
      setBlockError('');
      if (blocked) await (api as any).unblockUser(targetId);
      else await (api as any).blockUser(targetId);
      setBlocked(!blocked);
      setBlockDialogOpen(false);
      setMessage(blocked ? 'Member unblocked.' : 'Member blocked.');
    } catch (error) {
      setBlockError(error instanceof Error ? error.message : 'Unable to update block status.');
    } finally {
      setBlocking(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.full_name?.trim()) {
      setEditError('Enter your name before saving your profile.');
      return;
    }
    try {
      setEditError('');
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
    } catch (e: any) { setEditError(e?.message || 'Unable to save profile.'); }
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

  const updateEditableProfile = (field: string, value: string) => {
    setProfile((previous: any) => ({ ...previous, [field]: value }));
    setEditError('');
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center"><div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading profile…</div></div>;
  if (loadError) return <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-4 text-center"><p className="text-sm font-semibold text-[#17233b]">We couldn't load this profile.</p><button type="button" onClick={() => { void load(); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d31d24] hover:text-[#b8171d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24]">Try again <span aria-hidden="true">↻</span></button></div>;
  if (!profile) return <div className="min-h-[70vh] flex flex-col items-center justify-center gap-2 px-4 text-center"><p className="text-sm font-semibold text-[#17233b]">This profile is unavailable.</p><p className="text-xs text-slate-500">The profile may have been removed or is not available yet.</p></div>;

  return <div className="min-h-screen bg-[#f3f2ef] pb-16">
    <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 lg:px-8">
      {message && <div className="profile-feedback mb-4 flex items-center justify-between gap-3 border border-[#e1e4e8] bg-white px-4 py-2 text-xs font-semibold text-[#17233b] shadow-sm" role="status" aria-live="polite"><span className="min-w-0 break-words">{message}</span><button type="button" onClick={() => setMessage('')} className="flex h-9 w-9 shrink-0 items-center justify-center text-[#697386] transition-colors hover:bg-[#f7f8f7] hover:text-[#17233b]" aria-label="Dismiss profile message"><X className="h-4 w-4" /></button></div>}
      {reportNotice && <div className="mb-4 flex items-center justify-between gap-3 border border-[#cce6d5] bg-[#f4fbf6] px-4 py-3 text-xs font-semibold text-[#246443]" role="status"><span>{reportNotice}</span><button type="button" onClick={() => setReportNotice('')} className="flex h-9 w-9 shrink-0 items-center justify-center" aria-label="Dismiss report confirmation"><X className="h-4 w-4" /></button></div>}

      <section className="relative overflow-visible border border-[#d9dfe6] bg-white shadow-sm">
        <div className="profile-cover h-32 bg-gradient-to-r from-[#172b4d] via-[#24527a] to-[#d31d24] sm:h-40" />
        <div className="px-5 pb-5 sm:px-8">
          <div className="relative -mt-16 flex min-w-0 flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <button type="button" onClick={() => own && togglePhotoMenu()} disabled={!own || uploading} className="profile-avatar group relative block h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-[#17233b] text-white shadow-md sm:h-36 sm:w-36 disabled:cursor-default" aria-label={own ? 'Change profile photo' : `${profile.full_name || 'Member'} profile photo`}>
                {profile.avatar_url && !avatarLoadError ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt={profile.full_name || 'Profile'} onError={() => setAvatarLoadError(true)} /> : <span className="flex h-full w-full items-center justify-center text-3xl font-bold tracking-wide">{initials}</span>}
                {own && <span className="absolute inset-0 flex items-center justify-center bg-[#17233b]/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"><Camera className="h-6 w-6" /></span>}
              </button>
              {own && <button ref={cameraButtonRef} type="button" onClick={togglePhotoMenu} disabled={uploading} className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#d31d24] text-white shadow-md transition-colors duration-200 hover:bg-[#b8171d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24] disabled:opacity-60" title="Change profile picture" aria-haspopup="true" aria-expanded={photoActionsOpen}><Camera className="h-4 w-4" /></button>}
              <input ref={avatarInput} type="file" accept="image/jpeg,.jpg,.jpeg,image/png,image/webp" className="hidden" onChange={e => { const file=e.target.files?.[0]; e.target.value=''; handlePhotoSelected(file); }} />
              {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            </div>
            <div className="min-w-0 flex-1 pb-1 pt-1 sm:pt-20">
              <div className="flex min-w-0 flex-wrap items-center gap-2"><h1 className="profile-name min-w-0 max-w-full break-words text-2xl font-bold text-[#17233b] sm:text-[28px]">{profile.full_name || 'SkillBarter Member'}</h1>
                {own && monetization?.premium && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0f0] px-2.5 py-1 text-[10px] font-bold text-[#b8171d]"><Crown className="h-3 w-3"/> Premium</span>}
                {own && monetization?.verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6ff] px-2.5 py-1 text-[10px] font-bold text-[#24527a]"><BadgeCheck className="h-3 w-3"/> Verified</span>}
                {own && featured && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e9] px-2.5 py-1 text-[10px] font-bold text-[#9b6b27]"><Rocket className="h-3 w-3"/> Featured</span>}
              </div>
              <p className="profile-headline mt-1 text-base text-[#384860]">{profile.headline || 'SkillBarter community member'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#697386]"><span className="profile-metadata inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{profile.address_display || 'Local community'}</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5"/>{profile.connections_count || 0} connections</span><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-[#d31d24]"/>{averageReview ? averageReview.toFixed(1) : 'New'} rating</span></div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1 sm:mt-20">{own ? <Button size="sm" variant="outline" onClick={() => { setEditing(!editing); setEditError(''); }} icon={<Edit3 className="h-3.5 w-3.5"/>}>{editing ? 'Close' : 'Edit profile'}</Button> : <><Button size="sm" onClick={() => setProposeOpen(true)} icon={<Repeat className="h-3.5 w-3.5"/>}>Propose exchange</Button><Link to={`/messages/${targetId}`}><Button size="sm" variant="outline" icon={<MessageSquare className="h-3.5 w-3.5"/>}>Message</Button></Link><Button size="sm" variant="ghost" onClick={() => { setReportError(''); setReportDetails(''); setReportDialogOpen(true); }} icon={<Flag className="h-3.5 w-3.5"/>}>Report</Button><Button size="sm" variant="ghost" onClick={() => { setBlockError(''); setBlockDialogOpen(true); }} icon={<ShieldOff className="h-3.5 w-3.5"/>}>{blocked ? 'Unblock' : 'Block'}</Button></>}</div>
          </div>
        </div>
      </section>

      {cropPreviewUrl && cropFile && own && <section className="mt-4 border border-[#d9dfe6] bg-white p-4 shadow-sm sm:p-5" aria-label="Adjust profile photo">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">ADJUST PROFILE PHOTO</p>
            <p className="mt-1 text-sm font-bold text-[#17233b]">Position your photo for the circular avatar.</p>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-semibold text-[#4f5d73]">Zoom
                <input type="range" min="1" max="2.5" step="0.05" value={cropZoom} onChange={e => setCropZoom(Number(e.target.value))} className="mt-2 w-full accent-[#d31d24]" />
              </label>
              <label className="text-xs font-semibold text-[#4f5d73]">Horizontal position
                <input type="range" min="-100" max="100" value={cropX} onChange={e => setCropX(Number(e.target.value))} className="mt-2 w-full accent-[#d31d24]" />
              </label>
              <label className="text-xs font-semibold text-[#4f5d73]">Vertical position
                <input type="range" min="-100" max="100" value={cropY} onChange={e => setCropY(Number(e.target.value))} className="mt-2 w-full accent-[#d31d24]" />
              </label>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-white bg-[#17233b] shadow-[0_4px_14px_rgba(23,35,59,.12)] sm:h-40 sm:w-40">
              <img src={cropPreviewUrl} alt="Profile photo preview" className="absolute inset-0 h-full w-full object-cover" style={{ transform: `translate(${cropX / 5}%, ${cropY / 5}%) scale(${cropZoom})` }} />
            </div>
            <span className="text-[10px] text-[#8a92a0]">Final circular preview</span>
          </div>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[#edf0f2] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={cancelCrop} disabled={uploading}>Cancel</Button>
          <Button type="button" size="sm" onClick={() => void saveCroppedPhoto()} loading={uploading}>Save photo</Button>
        </div>
      </section>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <main className="space-y-4">
          {editing && own && (
            <section className="profile-edit-panel border border-[#d9dfe6] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Edit3 className="h-4 w-4 text-[#d31d24]" /><h2 className="text-base font-bold text-[#17233b]">Edit introduction</h2></div>
              <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#4f5d73]">Name
                  <input required disabled={saving} aria-invalid={Boolean(editError && !profile.full_name?.trim())} aria-describedby={editError ? 'profile-edit-error' : undefined} className="profile-edit-input mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[#f7f8f7]" value={profile.full_name || ''} onChange={e => updateEditableProfile('full_name', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-[#4f5d73]">Headline
                  <input disabled={saving} className="profile-edit-input mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[#f7f8f7]" value={profile.headline || ''} onChange={e => updateEditableProfile('headline', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-[#4f5d73] sm:col-span-2">About
                  <textarea disabled={saving} rows={5} className="profile-edit-input mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[#f7f8f7]" value={profile.bio || ''} onChange={e => updateEditableProfile('bio', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-[#4f5d73]">Location
                  <input disabled={saving} className="profile-edit-input mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[#f7f8f7]" value={profile.address_display || ''} onChange={e => updateEditableProfile('address_display', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-[#4f5d73]">Availability
                  <input disabled={saving} className="profile-edit-input mt-1 w-full border border-[#d9dfe6] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[#f7f8f7]" value={profile.availability || ''} onChange={e => updateEditableProfile('availability', e.target.value)} />
                </label>
                {editError && <p id="profile-edit-error" role="alert" className="profile-edit-error sm:col-span-2">{editError}</p>}
                <div className="flex flex-wrap gap-2 border-t border-[#edf0f2] pt-4 sm:col-span-2">
                  <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => { setEditing(false); setEditError(''); }}>Close editor</Button>
                  <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save changes</Button>
                </div>
              </form>
            </section>
          )}

          {own && (
            <section className={`border p-5 shadow-sm ${profileCompletion === 100 ? 'border-[#e1e4e8] bg-white' : 'border-[#ead0d1] bg-[#fffafa]'}`} aria-label="Profile completion">
              {profileCompletion === 100 ? (
                <p className="flex items-center gap-2 text-xs font-semibold text-[#697386]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  Profile complete ✓
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#17233b]">Profile setup · {profileCompletion}%</p>
                      <p className="mt-1 text-xs text-[#697386]">
                        Missing: {missingCompletionItems.map(item => item.label).join(', ')}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => { setEditing(true); setEditError(''); }} icon={<Edit3 className="h-3.5 w-3.5" />}>
                      Complete profile →
                    </Button>
                  </div>
                  <div className="profile-completion-track mt-4 h-2 overflow-hidden bg-[#e6e8eb]" role="progressbar" aria-label={`Profile completion ${profileCompletion}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion}>
                    <div className="profile-completion-bar h-full bg-[#d31d24]" style={{ width: `${profileCompletion}%` }} />
                  </div>
                </>
              )}
            </section>
          )}

          {showOrientation && (
            <section className="border border-[#d9dfe6] bg-white px-4 py-4 shadow-sm sm:px-5" aria-label="Onboarding complete">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">YOU'RE READY</p>
                  <p className="mt-1 text-sm font-bold text-[#17233b]">Your profile is ready.</p>
                  <p className="mt-1 text-xs leading-5 text-[#697386]">You’re ready to find a learning partner and start your first exchange.</p>
                </div>
                <Button size="sm" onClick={continueFromCompletion} className="w-full sm:w-auto sm:shrink-0">
                  Find a learning partner →
                </Button>
              </div>
            </section>
          )}

          <section className="profile-section border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#17233b]">About</h2><p className="mt-3 break-words whitespace-pre-line text-sm leading-7 text-[#4f5d73]">{profile.bio || 'Add a short introduction about your background, what you enjoy teaching, and what you want to learn through SkillBarter.'}</p></section>

          <section className="profile-section border border-[#d9dfe6] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#17233b]">Skills</h2><p className="mt-1 text-xs text-[#697386]">Your professional capabilities and learning goals.</p></div><Sparkles className="h-5 w-5 text-[#d31d24]"/></div><div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-[#697386]">Offering</h3><div className="mt-2 flex flex-wrap gap-2">{offered.length ? offered.map((s:any)=><span key={s.id} className="profile-skill-chip inline-flex max-w-full items-center gap-2 rounded-full border border-[#d9dfe6] bg-[#f7f9fb] px-3 py-1.5 text-xs font-semibold text-[#24354e]"><span className="break-words">{s.skill_name}</span>{own && <button type="button" aria-label={`Remove ${s.skill_name}`} onClick={()=>removeSkill(Number(s.id))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-[#d31d24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d31d24]"><Trash2 className="h-3 w-3"/></button>}</span>) : <span className="text-xs text-slate-400">No offered skills yet.</span>}</div></div><div className="mt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-[#697386]">Looking to learn</h3><div className="mt-2 flex flex-wrap gap-2">{needed.length ? needed.map((s:any)=><span key={s.id} className="profile-skill-chip inline-flex max-w-full items-center gap-2 rounded-full border border-[#f0d5d6] bg-[#fff6f6] px-3 py-1.5 text-xs font-semibold text-[#8e242a]"><span className="break-words">{s.skill_name}</span>{own && <button type="button" aria-label={`Remove ${s.skill_name}`} onClick={()=>removeSkill(Number(s.id))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-[#d31d24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d31d24]"><Trash2 className="h-3 w-3"/></button>}</span>) : <span className="text-xs text-slate-400">No learning goals yet.</span>}</div></div>{own && <form onSubmit={addSkill} className="mt-5 flex flex-col gap-2 border-t border-[#edf0f3] pt-4 sm:flex-row"><input value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="Add a skill" className="h-10 min-w-0 flex-1 border border-[#d9dfe6] px-3 text-xs"/><select value={skillType} onChange={e=>setSkillType(e.target.value as any)} className="h-10 border border-[#d9dfe6] px-3 text-xs"><option value="OFFERED">I can teach</option><option value="NEEDED">I want to learn</option></select><Button size="sm" type="submit" disabled={saving || !skillName.trim()} icon={<Plus className="h-3.5 w-3.5"/>}>Add</Button></form>}</section>

          <section className="profile-section border border-[#d9dfe6] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#d31d24]" /><h2 className="text-lg font-bold text-[#17233b]">Trust & reputation</h2></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="border border-[#e1e4e8] bg-[#f8fafc] p-4"><p className="text-xs text-[#697386]">Trust score</p><p className="mt-1 text-2xl font-black text-[#d31d24]">{Math.round(profile.trust_score || 0)}<span className="text-sm font-semibold text-slate-500">/100</span></p></div>
              <div className="border border-[#e1e4e8] bg-[#f8fafc] p-4"><p className="text-xs text-[#697386]">Reliability</p><p className="mt-1 text-2xl font-black text-[#17233b]">{Math.round(profile.reliability_score || 0)}%</p></div>
              <div className="border border-[#e1e4e8] bg-[#f8fafc] p-4"><p className="text-xs text-[#697386]">Completed</p><p className="mt-1 text-2xl font-black text-[#17233b]">{profile.completed_exchanges || 0}</p></div>
            </div>
            {reviews.length ? (
              <div className="mt-5 space-y-3">
                {reviews.slice(0, 3).map((review: any, index: number) => (
                  <article key={review.id || index} className="border-t border-[#edf0f3] pt-3">
                    <div className="flex items-center gap-1 text-[#d31d24]" aria-label={`${review.rating || 0} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-3.5 w-3.5 ${star <= Number(review.rating || 0) ? 'fill-current' : ''}`} aria-hidden="true" />)}
                    </div>
                    <p className="mt-2 break-words text-sm leading-6 text-[#4f5d73]">{review.comment || review.review || 'Positive exchange experience.'}</p>
                  </article>
                ))}
              </div>
            ) : <p className="mt-5 border-t border-[#edf0f3] pt-4 text-sm text-[#697386]">No reviews yet. Reviews from completed learning exchanges will appear here.</p>}
          </section>
        </main>

        <aside className="space-y-4">
          <section className="profile-section border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#17233b]">Profile highlights</h2><div className="mt-4 space-y-4"><div className="flex gap-3"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[#697386]"/><div className="min-w-0"><p className="text-xs font-bold text-[#17233b]">Open to skill exchange</p><p className="mt-1 break-words text-xs text-[#697386]">{profile.primary_intent || 'Learning, teaching and collaboration'}</p></div></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d31d24]"/><div className="min-w-0"><p className="text-xs font-bold text-[#17233b]">Availability</p><p className="mt-1 break-words text-xs text-[#697386]">{profile.availability || 'Flexible'}</p></div></div><div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#697386]"/><div className="min-w-0"><p className="text-xs font-bold text-[#17233b]">Exchange area</p><p className="mt-1 break-words text-xs text-[#697386]">Within {profile.exchange_radius_km || 10} km</p></div></div></div></section>
          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#17233b]">Why connect?</h2><p className="mt-2 text-xs leading-5 text-[#697386]">Connect when your skills and learning goals complement each other. SkillBarter is built for meaningful exchanges, not follower counts.</p>{!own && <div className="mt-4 grid gap-2"><Button size="sm" onClick={()=>setProposeOpen(true)} icon={<Repeat className="h-3.5 w-3.5"/>}>Start an exchange</Button><Link to={`/messages/${targetId}`}><Button size="sm" variant="outline" className="w-full" icon={<MessageSquare className="h-3.5 w-3.5"/>}>Send message</Button></Link></div>}</section>
          <section className="border border-[#d9dfe6] bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-[#17233b]">SkillBarter profile</h2><div className="mt-4 space-y-3 text-xs text-[#697386]"><p className="flex items-center gap-2"><GraduationCap className="h-4 w-4"/> Learn from peers</p><p className="flex items-center gap-2"><Users className="h-4 w-4"/> Grow your local network</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Build trusted reputation</p></div></section>
        </aside>
      </div>
    </div>
    <Modal isOpen={reportDialogOpen} onClose={() => setReportDialogOpen(false)} title="Report this profile" subtitle="Share a specific concern for the community safety team." maxWidth="sm">
      <form onSubmit={handleReport} className="space-y-4">
        <p className="text-sm leading-6 text-[#4d5b72]">Reports are reviewed privately. Please include only the details needed to understand the concern.</p>
        <label htmlFor="profile-report-details" className="block text-xs font-semibold text-[#17233b]">What should we know?
          <textarea id="profile-report-details" value={reportDetails} onChange={event => setReportDetails(event.target.value)} rows={5} maxLength={2000} required className="mt-1.5 min-h-28 w-full resize-y border border-[#d9dde2] bg-white p-3 text-sm text-[#17233b] outline-none focus:border-[#d31d24]" aria-describedby="profile-report-count" />
        </label>
        <p id="profile-report-count" className="text-right text-[10px] text-slate-500">{reportDetails.length}/2000 characters</p>
        {reportError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">{reportError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-[#e1e4e8] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => setReportDialogOpen(false)} disabled={reportSending}>Cancel</Button>
          <Button type="submit" size="sm" loading={reportSending} disabled={reportSending || !reportDetails.trim()} icon={<Flag className="h-3.5 w-3.5" />}>Send report</Button>
        </div>
      </form>
    </Modal>
    <Modal isOpen={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} title={blocked ? 'Unblock this member?' : 'Block this member?'} subtitle={blocked ? 'This member will be available in your learning network again.' : 'This member will no longer appear in your matching flow.'} maxWidth="sm">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-[#4d5b72]">{blocked ? `You can message ${profile.full_name} again after unblocking.` : `You can unblock ${profile.full_name} later from your safety settings.`}</p>
        {blockError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">{blockError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-[#e1e4e8] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => setBlockDialogOpen(false)} disabled={blocking}>Cancel</Button>
          <Button type="button" size="sm" variant={blocked ? 'secondary' : 'danger'} onClick={() => void handleBlockToggle()} loading={blocking}>{blocked ? 'Unblock member' : 'Block member'}</Button>
        </div>
      </div>
    </Modal>
    {proposeOpen && <ProposeExchangeModal isOpen={proposeOpen} onClose={()=>setProposeOpen(false)} partner={profile} defaultPartnerSkill={profile.skills_offered?.[0] || ''} defaultMySkill={currentUser?.skills?.find((s:any)=>s.skill_type==='OFFERED')?.skill_name || ''} onSuccess={()=>{setProposeOpen(false); setMessage('Exchange proposal sent.');}} />}
    {photoActionsOpen && own && menuPos && createPortal(
      <div
        ref={photoMenuRef}
        role="menu"
        aria-label="Profile photo options"
        style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
        className="w-56 border border-[#e1e4e8] bg-white p-1.5 shadow-[0_10px_24px_rgba(23,35,59,.15)] motion-safe:animate-[photoMenuIn_0.15s_ease-out]"
      >
        <button type="button" role="menuitem" onClick={choosePhoto} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[#17233b] transition-colors hover:bg-[#f7f7f5] focus-visible:bg-[#f7f7f5] focus-visible:outline-none"><Upload className="h-4 w-4 text-[#d31d24]" />Upload from device</button>
        <button type="button" role="menuitem" onClick={choosePhoto} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[#17233b] transition-colors hover:bg-[#f7f7f5] focus-visible:bg-[#f7f7f5] focus-visible:outline-none"><ImagePlus className="h-4 w-4 text-[#d31d24]" />Choose another image</button>
        {profile.avatar_url && <button type="button" role="menuitem" onClick={() => void removePhoto()} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[#b8171d] transition-colors hover:bg-[#fff5f5] focus-visible:bg-[#fff5f5] focus-visible:outline-none"><RemovePhoto className="h-4 w-4" />Remove photo</button>}
      </div>,
      document.body
    )}
  </div>;
};

export default LinkedInStyleProfilePage;
