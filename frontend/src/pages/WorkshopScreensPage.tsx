import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Plus, Share2, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d31d24] focus:ring-2 focus:ring-red-100';

async function shareWorkshop(title: string, content: string) {
  if (navigator.share) { await navigator.share({ title, text: content, url: window.location.href }); return 'Shared successfully.'; }
  if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); return 'Workshop link copied to clipboard.'; }
  return 'Sharing is unavailable in this browser.';
}

export const WorkshopScreensPage: React.FC = () => {
  const { id = 'workshops' } = useParams();
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try { setPosts(await api.getFeed('WORKSHOP')); }
    catch (e: any) { setMsg(e?.message || 'Unable to load workshops.'); }
  };
  useEffect(() => { load(); }, []);

  const mine = useMemo(() => posts.filter(p => Number(p.author_id) === Number(currentUser?.id)), [posts, currentUser?.id]);

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setMsg('Workshop title and details are required.'); return; }
    try {
      setBusy(true);
      await api.createPost({ post_type: 'WORKSHOP', title: title.trim(), content: content.trim() });
      setTitle(''); setContent(''); await load(); setMsg('Workshop published successfully.');
    } catch (err: any) { setMsg(err?.message || 'Unable to publish workshop.'); }
    finally { setBusy(false); }
  };

  if (id === 'create-workshop') return <div className="mx-auto max-w-3xl px-4 py-8"><Button variant="ghost" onClick={() => nav(-1)} icon={<ArrowLeft className="h-4 w-4"/>}>Back</Button><Card className="mt-4 p-6"><div className="flex items-center gap-2 text-[#d31d24]"><Plus className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-wider">Workshops</span></div><h1 className="mt-2 text-2xl font-bold">Create Workshop</h1><p className="mt-1 text-sm text-slate-500">Publish a real workshop to the SkillBarter community feed.</p><form onSubmit={publish} className="mt-6 space-y-3"><input className={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Workshop title"/><textarea className={input} rows={7} value={content} onChange={e => setContent(e.target.value)} placeholder="Describe what attendees will learn, duration, format and any requirements."/><Button type="submit" disabled={busy}>Publish workshop</Button></form>{msg && <p className="mt-4 text-sm text-slate-600">{msg}</p>}</Card></div>;

  const visible = id === 'my-workshops' ? mine : posts;
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d31d24]"><Sparkles className="h-4 w-4"/> Workshops</div><h1 className="mt-1 text-2xl font-bold">{id === 'my-workshops' ? 'My Workshops' : 'Workshops'}</h1><p className="mt-1 text-sm text-slate-500">{id === 'my-workshops' ? 'Workshops you have published.' : 'Live workshops published by SkillBarter members.'}</p></div><div className="flex gap-2"><Button onClick={() => nav('/workshops/create-workshop')} icon={<Plus className="h-4 w-4"/>}>Create workshop</Button><Button variant="ghost" onClick={() => nav(-1)} icon={<ArrowLeft className="h-4 w-4"/>}>Back</Button></div></div>{msg && <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">{msg}</div>}<div className="space-y-3">{visible.length ? visible.map(p => <Card key={p.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold text-[#d31d24]"><CalendarDays className="h-4 w-4"/> WORKSHOP</div><h2 className="mt-1 text-lg font-bold">{p.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{p.content}</p><p className="mt-3 text-xs text-slate-400">Published {p.created_at ? new Date(p.created_at).toLocaleString() : 'recently'}</p></div><Button size="sm" variant="outline" onClick={async()=>{try{setMsg(await shareWorkshop(p.title,p.content));}catch(e:any){if(e?.name!=='AbortError')setMsg('Sharing failed. Please try again.');}}} icon={<Share2 className="h-4 w-4"/>}>Share</Button></div></Card>) : <Card className="p-10 text-center text-sm text-slate-500">No workshops published yet. Create the first one.</Card>}</div></div>;
};
