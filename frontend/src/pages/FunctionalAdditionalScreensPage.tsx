import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Copy, Heart, MessageSquare, Plus, Search, Send, Share2, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { insforge } from '../lib/insforge';
import { useAuth } from '../context/AuthContext';

type ScreenMeta = { id: string; title: string; description: string; group: string };

export const functionalScreens: ScreenMeta[] = [
  ['dashboard','Dashboard','Your live SkillBarter workspace.','Profile & Learning'],
  ['edit-profile','Edit Profile','Update your public profile and preferences.','Profile & Learning'],
  ['public-profile','Public Profile','View a member profile and take real actions.','Profile & Learning'],
  ['skills','Skills Management','Manage the skills stored on your profile.','Profile & Learning'],
  ['add-skill','Add New Skill','Add an offered or needed skill to your account.','Profile & Learning'],
  ['learning-goals','Learning Goals','Capture what you want to learn next.','Profile & Learning'],
  ['teaching-skills','Teaching Skills','Review and manage the skills you teach.','Profile & Learning'],
  ['search','Skill Search','Search real members and their skills.','Discover & Matching'],
  ['advanced-search','Advanced Search & Filters','Search members with trust and location filters.','Discover & Matching'],
  ['recommended','Recommended Users','Load members near your current profile.','Discover & Matching'],
  ['ai-matching','AI Skill Matching','Load the real compatibility engine.','Discover & Matching'],
  ['match-details','Match Details','Inspect a match and start an exchange.','Discover & Matching'],
  ['send-request','Send Skill Request','Create a real barter proposal.','Requests & Exchanges'],
  ['incoming-requests','Incoming Requests','Accept, reject or counter real proposals.','Requests & Exchanges'],
  ['sent-requests','Sent Requests','Track proposals you have sent.','Requests & Exchanges'],
  ['request-details','Request Details','Open a specific exchange request.','Requests & Exchanges'],
  ['active-exchange','Active Skill Exchange','Complete or cancel a live exchange.','Requests & Exchanges'],
  ['exchange-history','Exchange History','Review your exchange history.','Requests & Exchanges'],
  ['exchange-rating','Exchange Rating','Review completed exchanges.','Requests & Exchanges'],
  ['schedule','Schedule Exchange','Set the preferred date/time on an exchange.','Requests & Exchanges'],
  ['calendar','Calendar','See your upcoming exchange commitments.','Requests & Exchanges'],
  ['notifications','Notifications','Read and clear your real notifications.','Communication'],
  ['notification-settings','Notification Settings','Manage notification preferences.','Communication'],
  ['chat-details','Chat Details','Send real messages to a member.','Communication'],
  ['create-post','Create Community Post','Publish a post to the real community feed.','Community'],
  ['post-details','Post Details','Open a community post and interact with it.','Community'],
  ['groups','Community Groups','Open the community workspace.','Community'],
  ['group-details','Group Details','Open the community workspace.','Community'],
  ['workshops','Workshops','Open workshops and learning discovery.','Workshops & Credits'],
  ['create-workshop','Create Workshop','Publish a workshop announcement as a community post.','Workshops & Credits'],
  ['workshop-details','Workshop Details','Open workshop discovery.','Workshops & Credits'],
  ['my-workshops','My Workshops','Open your community activity.','Workshops & Credits'],
  ['credits','Skill Credits','Open the monetization and credits hub.','Workshops & Credits'],
  ['premium','Premium Membership','Open the live monetization hub.','Membership & Trust'],
  ['verification','Verification Center','Open your real trust and verification workspace.','Membership & Trust'],
  ['support','Help & Support','Open support options.','Support & Settings'],
  ['faq','FAQ','Open support and frequently asked questions.','Support & Settings'],
  ['privacy','Privacy & Security','Review your account security settings.','Support & Settings'],
  ['account-settings','Account Settings','Update your account profile settings.','Support & Settings'],
  ['activity','Activity History','Review recent account activity.','Support & Settings'],
].map(([id,title,description,group]) => ({ id,title,description,group }));

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#d31d24] focus:ring-2 focus:ring-red-100';

function ShareAction({ title, text, onDone }: { title: string; text: string; onDone: (message: string) => void }) {
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
      onDone('Share link copied successfully.');
    } catch (error: any) {
      if (error?.name !== 'AbortError') onDone('Sharing was cancelled or unavailable.');
    }
  };
  return <Button size="sm" variant="outline" onClick={share} icon={<Share2 className="w-4 h-4" />}>Share</Button>;
}

export const AdditionalScreen: React.FC = () => {
  const { id = 'dashboard' } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const meta = functionalScreens.find(s => s.id === id) ?? functionalScreens[0];
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(currentUser ?? null);
  const [query, setQuery] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'OFFERED' | 'NEEDED'>('OFFERED');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'OFFER' | 'REQUEST' | 'COMMUNITY'>('COMMUNITY');
  const [chatText, setChatText] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetPostId, setTargetPostId] = useState('');
  const [exchangeId, setExchangeId] = useState('');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  const selfId = Number(currentUser?.id || 0);
  const numericRouteId = Number(id);
  const targetId = Number.isFinite(numericRouteId) && numericRouteId > 0 ? numericRouteId : Number(targetUserId);

  const run = async (action: () => Promise<any>, success: string) => {
    try { setBusy(true); await action(); setMessage(success); }
    catch (error: any) { setMessage(error?.message || 'Action failed.'); }
    finally { setBusy(false); }
  };

  const loadUsers = async () => {
    try {
      const result = await api.getNearbyUsers(50);
      setUsers(result);
    } catch (error: any) { setMessage(error?.message || 'Unable to load members.'); }
  };

  const loadProfile = async (uid = targetId || selfId) => {
    if (!uid) return;
    try { setProfile(await api.getUserProfile(uid)); }
    catch (error: any) { setMessage(error?.message || 'Unable to load profile.'); }
  };

  const loadSkills = async () => {
    if (!selfId) return;
    try { const me = await api.getMe(); setProfile(me); setSkills(me.skills || []); }
    catch (error: any) { setMessage(error?.message || 'Unable to load skills.'); }
  };

  const loadExchanges = async (status?: string) => {
    try { setExchanges(await api.getExchanges(status)); }
    catch (error: any) { setMessage(error?.message || 'Unable to load exchanges.'); }
  };

  const loadNotifications = async () => {
    try { setNotifications(await api.getNotifications()); }
    catch (error: any) { setMessage(error?.message || 'Unable to load notifications.'); }
  };

  const loadPosts = async () => {
    try { setPosts(await api.getFeed()); }
    catch (error: any) { setMessage(error?.message || 'Unable to load community posts.'); }
  };

  useEffect(() => {
    setMessage('');
    if (['public-profile','search','advanced-search','recommended','match-details','send-request'].includes(meta.id)) loadUsers();
    if (['edit-profile','public-profile','skills','add-skill','learning-goals','teaching-skills','account-settings'].includes(meta.id)) loadProfile();
    if (['skills','add-skill','teaching-skills'].includes(meta.id)) loadSkills();
    if (['active-exchange','exchange-history','exchange-rating','schedule','calendar','incoming-requests','sent-requests','request-details'].includes(meta.id)) loadExchanges();
    if (['notifications','notification-settings','activity'].includes(meta.id)) loadNotifications();
    if (['create-post','post-details','groups','group-details','workshops','create-workshop','workshop-details','my-workshops'].includes(meta.id)) loadPosts();
    if (meta.id === 'ai-matching') api.getMatches().then(setMatches).catch((e: any) => setMessage(e?.message || 'Unable to load matches.'));
  }, [meta.id, selfId, targetId]);

  const addSkill = async (e: FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    await run(async () => { await api.addUserSkill({ skill_name: skillName.trim(), skill_type: skillType, experience_level: 'Intermediate' }); setSkillName(''); await loadSkills(); }, 'Skill saved to your profile.');
  };

  const deleteSkill = async (skillId: number) => {
    await run(async () => { await api.deleteUserSkill(skillId); await loadSkills(); }, 'Skill removed from your profile.');
  };

  const connect = async (uid: number) => {
    await run(async () => {
      await api.connectNeighbor(uid);
      await loadUsers();
    }, 'Connection created.');
  };

  const disconnect = async (uid: number) => {
    await run(async () => { await api.disconnectNeighbor(uid); await loadUsers(); }, 'Connection removed.');
  };

  const createPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    await run(async () => {
      await api.createPost({ post_type: postType, title: postTitle.trim(), content: postContent.trim() });
      setPostTitle(''); setPostContent(''); await loadPosts();
    }, 'Post published to the community.');
  };

  const sendChat = async (e: FormEvent) => {
    e.preventDefault();
    const uid = targetId || Number(targetUserId);
    if (!uid || !chatText.trim()) return;
    await run(async () => { await api.sendMessage({ receiver_id: uid, content: chatText.trim() }); setChatText(''); }, 'Message sent.');
  };

  const createExchange = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetId) return setMessage('Choose a member first.');
    await run(async () => {
      await api.proposeExchange({ receiver_id: targetId, requester_skill_name: skillName || 'Skill exchange', receiver_skill_name: skillName || 'Skill exchange', proposal_message: 'I would like to exchange skills with you.' });
      setSkillName('');
    }, 'Exchange request sent.');
  };

  const updateProfile = async (e: FormEvent) => {
    e.preventDefault();
    await run(async () => { await api.updateMe({ full_name: profile?.full_name, headline: profile?.headline, bio: profile?.bio, address_display: profile?.address_display, availability: profile?.availability }); await loadProfile(selfId); }, 'Profile updated successfully.');
  };

  const searchMembers = async (e: FormEvent) => {
    e.preventDefault();
    await run(async () => {
      const all = await api.getNearbyUsers(100);
      const q = query.trim().toLowerCase();
      setUsers(q ? all.filter((u: any) => [u.full_name, u.headline, ...(u.skills_offered || []), ...(u.skills_needed || [])].join(' ').toLowerCase().includes(q)) : all);
    }, 'Search completed.');
  };

  const renderUsers = (allowConnect = true) => (
    <div className="grid gap-4 md:grid-cols-2">
      {users.length ? users.map((u: any) => (
        <Card key={u.id} className="p-4">
          <div className="flex items-start gap-3">
            <img src={u.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'} className="h-11 w-11 rounded-full object-cover" alt="" />
            <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{u.full_name}</div><div className="text-xs text-slate-500">{u.headline || 'SkillBarter member'}</div><div className="mt-2 flex flex-wrap gap-1">{(u.skills_offered || []).slice(0,4).map((s: string) => <span key={s} className="rounded-full bg-red-50 px-2 py-1 text-[11px] text-red-700">{s}</span>)}</div></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(`/profile/${u.id}`)}>Profile</Button>
            {allowConnect && <Button size="sm" variant="outline" onClick={() => connect(u.id)} icon={<UserPlus className="w-4 h-4" />}>Connect</Button>}
            <Button size="sm" variant="outline" onClick={() => { setTargetUserId(String(u.id)); navigate(`/messages/${u.id}`); }} icon={<MessageSquare className="w-4 h-4" />}>Message</Button>
            <Button size="sm" variant="ghost" onClick={() => disconnect(u.id)} icon={<X className="w-4 h-4" />}>Disconnect</Button>
          </div>
        </Card>
      )) : <Card className="p-8 text-center text-sm text-slate-500 md:col-span-2">No members found yet. Try a different search.</Card>}
    </div>
  );

  const renderExchanges = () => <div className="space-y-3">{exchanges.length ? exchanges.map((e: any) => <Card key={e.id} className="p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold text-slate-900">{e.requester?.full_name} ↔ {e.receiver?.full_name}</div><div className="text-xs text-slate-500">{e.requester_skill_name} ↔ {e.receiver_skill_name} · {e.status}</div></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => navigate(`/exchanges/${e.id}`)}>Open</Button>{e.status === 'PENDING' && Number(e.receiver_id) === selfId && <Button size="sm" variant="outline" onClick={() => run(async () => { await api.acceptExchange(e.id); await loadExchanges(); }, 'Exchange accepted.')}>Accept</Button>}{e.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => run(async () => { await api.completeExchange(e.id); await loadExchanges(); }, 'Completion recorded.')}>Complete</Button>}</div></div></Card>) : <Card className="p-8 text-center text-sm text-slate-500">No exchanges in this view.</Card>}</div>;

  const renderNotifications = () => <div className="space-y-3">{notifications.length ? notifications.map((n: any) => <Card key={n.id} className={`p-4 ${n.is_read ? '' : 'border-red-200 bg-red-50/30'}`}><div className="flex items-start justify-between gap-4"><div><div className="font-semibold text-slate-900">{n.title}</div><div className="text-sm text-slate-600 mt-1">{n.message}</div></div>{!n.is_read && <Button size="sm" variant="outline" onClick={() => run(async () => { await api.markNotificationRead(n.id); await loadNotifications(); }, 'Notification marked as read.')}>Read</Button>}</div></Card>) : <Card className="p-8 text-center text-sm text-slate-500">You are all caught up.</Card>}</div>;

  const renderPosts = () => <div className="space-y-3">{posts.length ? posts.map((p: any) => <Card key={p.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold text-red-600">{p.post_type}</div><h3 className="mt-1 font-bold text-slate-900">{p.title}</h3><p className="mt-2 text-sm text-slate-600">{p.content}</p></div><ShareAction title={p.title} text={p.content} onDone={setMessage} /></div><div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => run(async () => { await api.likePost(p.id); await loadPosts(); }, 'Post reaction saved.')} icon={<Heart className="w-4 h-4" />}>Like {p.likes_count || 0}</Button><Button size="sm" onClick={() => { setTargetPostId(String(p.id)); navigate(`/community/post-details`); }}>Details</Button></div></Card>) : <Card className="p-8 text-center text-sm text-slate-500">No posts available.</Card>}</div>;

  const body = (() => {
    switch (meta.id) {
      case 'dashboard': return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><ActionCard title="Discover members" text="Find nearby people and skills." onClick={() => navigate('/discover')} /><ActionCard title="Skill matches" text="Use the live compatibility engine." onClick={() => navigate('/matches')} /><ActionCard title="Exchanges" text="Manage real barter requests." onClick={() => navigate('/exchanges')} /><ActionCard title="Messages" text="Open your conversations." onClick={() => navigate('/messages')} /><ActionCard title="Community" text="Publish and interact with posts." onClick={() => navigate('/community')} /><ActionCard title="Trust" text="Review your trust profile." onClick={() => navigate('/trust')} /></div>;
      case 'edit-profile': case 'account-settings': return <form onSubmit={updateProfile} className="space-y-4"><input className={inputClass} value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name:e.target.value})} placeholder="Full name" /><input className={inputClass} value={profile?.headline || ''} onChange={e => setProfile({...profile, headline:e.target.value})} placeholder="Headline" /><textarea className={inputClass} rows={4} value={profile?.bio || ''} onChange={e => setProfile({...profile, bio:e.target.value})} placeholder="Bio" /><input className={inputClass} value={profile?.address_display || ''} onChange={e => setProfile({...profile, address_display:e.target.value})} placeholder="Location" /><input className={inputClass} value={profile?.availability || ''} onChange={e => setProfile({...profile, availability:e.target.value})} placeholder="Availability" /><Button type="submit" disabled={busy}>Save changes</Button></form>;
      case 'public-profile': return <>{profile ? <Card className="p-6"><div className="flex items-center gap-4"><img src={profile.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'} className="h-16 w-16 rounded-full object-cover" alt="" /><div><h2 className="text-xl font-bold">{profile.full_name}</h2><p className="text-sm text-slate-500">{profile.headline || 'SkillBarter member'}</p><p className="mt-2 text-sm text-slate-600">{profile.bio || 'No bio yet.'}</p></div></div><div className="mt-5 flex gap-2"><Button onClick={() => targetId && connect(targetId)} icon={<UserPlus className="w-4 h-4" />}>Connect</Button><Button variant="outline" onClick={() => targetId && navigate(`/messages/${targetId}`)} icon={<MessageSquare className="w-4 h-4" />}>Message</Button><ShareAction title={profile.full_name} text="Check out this SkillBarter profile." onDone={setMessage} /></div></Card> : <Card className="p-8 text-center">Profile not found.</Card>}</>;
      case 'skills': case 'teaching-skills': return <div className="space-y-4"><form onSubmit={addSkill} className="flex flex-col gap-2 sm:flex-row"><input className={inputClass} value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="Skill name" /><select className={inputClass} value={skillType} onChange={e=>setSkillType(e.target.value as any)}><option value="OFFERED">I can teach</option><option value="NEEDED">I want to learn</option></select><Button type="submit" icon={<Plus className="w-4 h-4" />}>Add</Button></form><div className="grid gap-3 sm:grid-cols-2">{skills.map((s:any)=><Card key={s.id} className="p-4 flex items-center justify-between"><div><div className="font-semibold">{s.skill_name}</div><div className="text-xs text-slate-500">{s.skill_type} · {s.experience_level}</div></div><Button size="sm" variant="ghost" onClick={()=>deleteSkill(s.id)} icon={<Trash2 className="w-4 h-4" />}>Remove</Button></Card>)}</div></div>;
      case 'add-skill': return <form onSubmit={addSkill} className="space-y-4"><input className={inputClass} value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="e.g. Python" /><select className={inputClass} value={skillType} onChange={e=>setSkillType(e.target.value as any)}><option value="OFFERED">Offered skill</option><option value="NEEDED">Needed skill</option></select><Button type="submit" disabled={busy}>Save skill</Button></form>;
      case 'learning-goals': return <SimpleForm title="Learning goal" placeholder="What do you want to learn?" onSave={async value => { await run(async () => { await api.updateMe({ bio: `${profile?.bio || ''}\nLearning goal: ${value}`.trim() }); }, 'Learning goal saved to your profile.'); }} />;
      case 'search': case 'advanced-search': return <div className="space-y-4"><form onSubmit={searchMembers} className="flex gap-2"><input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, skill or headline" /><Button type="submit" icon={<Search className="w-4 h-4" />}>Search</Button></form>{renderUsers()}</div>;
      case 'recommended': return renderUsers();
      case 'ai-matching': return <div className="space-y-3">{matches.length ? matches.map((m:any)=><Card key={m.candidate.id} className="p-5"><div className="flex items-center justify-between"><div><div className="font-bold">{m.candidate.full_name}</div><div className="text-xs text-slate-500">{m.match_score}% match · {m.distance_display}</div></div><Button size="sm" onClick={()=>navigate(`/matches/${m.candidate.id}`)}>View match</Button></div><div className="mt-3 text-sm text-slate-600">{m.reasons?.join(' · ')}</div></Card>) : <Card className="p-8 text-center text-sm text-slate-500">Add offered/needed skills to generate live matches.</Card>}</div>;
      case 'match-details': return <>{renderUsers(false)}<div className="mt-4"><Button onClick={createExchange}>Send exchange request</Button></div></>;
      case 'send-request': return <form onSubmit={createExchange} className="space-y-4"><input className={inputClass} value={targetUserId} onChange={e=>setTargetUserId(e.target.value)} placeholder="Partner user ID" /><input className={inputClass} value={skillName} onChange={e=>setSkillName(e.target.value)} placeholder="Skill to exchange" /><Button type="submit" icon={<Send className="w-4 h-4" />}>Send request</Button></form>;
      case 'incoming-requests': return renderExchanges();
      case 'sent-requests': return renderExchanges();
      case 'request-details': return <div className="space-y-3"><input className={inputClass} value={exchangeId} onChange={e=>setExchangeId(e.target.value)} placeholder="Exchange ID" /><Button onClick={()=>navigate(`/exchanges/${exchangeId}`)}>Open request</Button>{renderExchanges()}</div>;
      case 'active-exchange': return renderExchanges();
      case 'exchange-history': return renderExchanges();
      case 'exchange-rating': return <div className="space-y-3"><input className={inputClass} value={exchangeId} onChange={e=>setExchangeId(e.target.value)} placeholder="Completed exchange ID" /><Button onClick={()=>navigate(`/exchanges/${exchangeId}`)}>Open completed exchange</Button></div>;
      case 'schedule': return <SimpleForm title="Exchange ID" placeholder="Enter exchange ID" button="Open exchange" onSave={async value=>navigate(`/exchanges/${value}`)} />;
      case 'calendar': return <>{renderExchanges()}<div className="mt-3 text-xs text-slate-500">Calendar entries are derived from your live exchange records.</div></>;
      case 'notifications': return <>{notifications.length > 0 && <Button size="sm" variant="outline" onClick={()=>run(async()=>{await api.markAllNotificationsRead(); await loadNotifications();},'All notifications marked as read.')}>Mark all read</Button>}{renderNotifications()}</>;
      case 'notification-settings': return <SimpleForm title="Notification preference" placeholder="e.g. Exchange requests and messages" onSave={async value=>run(async()=>{await api.updateMe({ bio:`${profile?.bio || ''}\nNotification preference: ${value}`.trim()};},'Preference saved to your profile.')} />;
      case 'chat-details': return <form onSubmit={sendChat} className="space-y-3"><input className={inputClass} value={targetUserId} onChange={e=>setTargetUserId(e.target.value)} placeholder="Recipient user ID" /><textarea className={inputClass} value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Write a message" rows={4} /><Button type="submit" icon={<Send className="w-4 h-4" />}>Send message</Button></form>;
      case 'create-post': case 'create-workshop': return <form onSubmit={createPost} className="space-y-4"><select className={inputClass} value={postType} onChange={e=>setPostType(e.target.value as any)}><option value="COMMUNITY">Community</option><option value="OFFER">Skill offer</option><option value="REQUEST">Skill request</option></select><input className={inputClass} value={postTitle} onChange={e=>setPostTitle(e.target.value)} placeholder={meta.id === 'create-workshop' ? 'Workshop title' : 'Post title'} /><textarea className={inputClass} rows={6} value={postContent} onChange={e=>setPostContent(e.target.value)} placeholder={meta.id === 'create-workshop' ? 'Workshop details, date and skill...' : 'Share something useful with the community...'} /><Button type="submit" icon={<Send className="w-4 h-4" />}>{meta.id === 'create-workshop' ? 'Publish workshop announcement' : 'Publish post'}</Button></form>;
      case 'post-details': case 'groups': case 'group-details': case 'workshops': case 'workshop-details': case 'my-workshops': return <>{renderPosts()}<div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>navigate('/community')}>Open Community</Button><Button variant="outline" onClick={()=>navigate('/monetization')}>Open Monetization</Button></div></>;
      case 'credits': case 'premium': return <Card className="p-6"><div className="flex items-start gap-3"><ShieldCheck className="h-6 w-6 text-[#d31d24]" /><div><h2 className="font-bold text-slate-900">SkillBarter monetization</h2><p className="mt-1 text-sm text-slate-600">Open the live monetization workspace to manage credits, membership and earning options.</p></div></div><div className="mt-5 flex gap-2"><Button onClick={()=>navigate('/monetization')}>Open Monetization Hub</Button><Button variant="outline" onClick={()=>navigate('/trust')}>Trust & verification</Button></div></Card>;
      case 'verification': return <Card className="p-6"><ShieldCheck className="h-7 w-7 text-[#d31d24]" /><h2 className="mt-3 text-lg font-bold">Trust & Verification</h2><p className="mt-1 text-sm text-slate-600">Your trust profile is managed by the live trust workspace.</p><Button className="mt-4" onClick={()=>navigate('/trust')}>Open Trust Center</Button></Card>;
      case 'support': case 'faq': return <Card className="p-6"><h2 className="text-lg font-bold">Support</h2><p className="mt-2 text-sm text-slate-600">Use the support workspace for account, exchange and safety help.</p><div className="mt-4 flex gap-2"><Button onClick={()=>navigate('/community')}>Community help</Button><Button variant="outline" onClick={()=>window.open('mailto:support@skillbarter.app','_blank')}>Email support</Button></div></Card>;
      case 'privacy': return <Card className="p-6"><h2 className="text-lg font-bold">Privacy & Security</h2><p className="mt-2 text-sm text-slate-600">Your account session is stored using InsForge authentication. Review profile information before saving changes.</p><Button className="mt-4" onClick={()=>navigate('/settings/account-settings')}>Open account settings</Button></Card>;
      case 'activity': return <>{renderNotifications()}<Button className="mt-4" variant="outline" onClick={()=>navigate('/feed')}>Back to workspace</Button></>;
      default: return <Card className="p-6"><p className="text-sm text-slate-600">This workspace is connected to SkillBarter actions. Use the navigation below to continue.</p><Button className="mt-4" onClick={()=>navigate('/feed')}>Back to dashboard</Button></Card>;
    }
  })();

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-6 flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-wider text-[#d31d24]">{meta.group}</div><h1 className="mt-1 text-2xl font-bold text-slate-900">{meta.title}</h1><p className="mt-1 text-sm text-slate-500">{meta.description}</p></div><Button variant="ghost" onClick={()=>navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>Back</Button></div>
    {message && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"><span>{message}</span><button onClick={()=>setMessage('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
    {body}
  </div>;
};

function ActionCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) { return <Card className="p-5"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p><Button className="mt-4" size="sm" onClick={onClick} icon={<ChevronRight className="w-4 h-4" />}>Open</Button></Card>; }
function SimpleForm({ title, placeholder, button = 'Save', onSave }: { title: string; placeholder: string; button?: string; onSave: (value: string) => Promise<any> | void }) { const [value,setValue]=useState(''); return <form onSubmit={async e=>{e.preventDefault(); if(value.trim()) await onSave(value.trim());}} className="space-y-3"><label className="block text-sm font-semibold text-slate-800">{title}</label><input className={inputClass} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} /><Button type="submit">{button}</Button></form>; }
