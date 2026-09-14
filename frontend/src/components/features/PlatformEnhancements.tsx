import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Bell, Bookmark, Calendar, CheckCircle2, Clock, Flag, Search, ShieldCheck, Sparkles, X } from 'lucide-react';

const key = (userId: number | string | undefined, name: string) => `skillbarter_feature_${userId || 'guest'}_${name}`;
const read = <T,>(storageKey: string, fallback: T): T => {
  try { const value = localStorage.getItem(storageKey); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

export const PlatformEnhancements: React.FC = () => {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const userId = currentUser?.id;
  const [bookmarks, setBookmarks] = useState<string[]>(() => read(key(userId, 'bookmarks'), []));
  const [availability, setAvailability] = useState(() => read(key(userId, 'availability'), { days: ['Mon', 'Wed', 'Fri'], from: '18:00', to: '21:00' }));
  const [status, setStatus] = useState(() => read(key(userId, 'exchange'), 'Requested'));
  const [notifications, setNotifications] = useState(() => read(key(userId, 'notifications'), { requests: true, exchanges: true, messages: true, recommendations: true }));
  const [bookmarkInput, setBookmarkInput] = useState('');
  const [report, setReport] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const offered = currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => s.skill_name) || [];
  const needed = currentUser?.skills?.filter(s => s.skill_type === 'NEEDED').map(s => s.skill_name) || [];
  const trust = Math.round(currentUser?.trust_score || 94);
  const trustParts = useMemo(() => [
    ['Exchanges', Math.min(30, Math.round(trust * .30)), 30],
    ['Ratings', Math.min(25, Math.round(trust * .25)), 25],
    ['Verification', Math.min(25, Math.round(trust * .25)), 25],
    ['Activity', Math.min(20, Math.round(trust * .20)), 20],
  ] as const, [trust]);

  const save = (name: string, value: unknown) => localStorage.setItem(key(userId, name), JSON.stringify(value));
  const addBookmark = () => {
    const value = bookmarkInput.trim();
    if (!value) return;
    const next = Array.from(new Set([...bookmarks, value]));
    setBookmarks(next); save('bookmarks', next); setBookmarkInput('');
  };

  // These enhancements live inside the existing product workflows; there is no separate feature page.
  if (pathname === '/feed') {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Smart Recommendations</h3></div><p className="text-[11px] text-slate-500 mb-2">Based on your learning goals.</p><div className="flex flex-wrap gap-1">{(needed.slice(0, 3).length ? needed.slice(0, 3) : ['Web Development', 'Photography']).map(s => <span key={s} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-semibold">{s}</span>)}</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Trust Overview</h3></div><div className="flex items-end gap-2"><span className="text-2xl font-black text-emerald-700">{trust}</span><span className="text-[10px] text-slate-400 mb-1">/ 100 trust score</span></div><div className="mt-2 h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${trust}%` }}/></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Bookmark className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Quick Bookmarks</h3></div><div className="flex gap-1.5"><input value={bookmarkInput} onChange={e => setBookmarkInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBookmark()} placeholder="Save a skill" className="min-w-0 flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px]"/><Button size="sm" onClick={addBookmark}>Save</Button></div><div className="flex flex-wrap gap-1 mt-2">{bookmarks.slice(0, 4).map(s => <span key={s} className="px-2 py-1 rounded-lg bg-slate-100 text-[10px]">{s}</span>)}</div></Card>
      </div>
    </div>;
  }

  if (pathname.startsWith('/discover')) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6"><Card className="p-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Search className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Advanced Discovery</h3></div><p className="text-[10px] text-slate-500 mt-1">Refine the existing Skill Search with level and distance preferences.</p></div><div className="flex flex-wrap gap-2"><select className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px]"><option>Any Level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><select className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px]"><option>Within 5 km</option><option>Within 10 km</option><option>Within 25 km</option><option>Within 50 km</option></select><span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{offered.length} skills offered</span></div></div></Card></div>;
  }

  if (pathname.startsWith('/profile/')) {
    return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Card className="p-4"><div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Availability</h3></div><div className="flex flex-wrap gap-1 mb-2">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <button key={day} onClick={() => setAvailability((a: any) => ({ ...a, days: a.days.includes(day) ? a.days.filter((d: string) => d !== day) : [...a.days, day] }))} className={`px-2 py-1 rounded-md text-[9px] font-bold ${availability.days.includes(day) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{day}</button>)}</div><div className="grid grid-cols-2 gap-2"><input type="time" value={availability.from} onChange={e => setAvailability({...availability, from: e.target.value})} className="p-1.5 rounded-lg border border-slate-200 text-[10px]"/><input type="time" value={availability.to} onChange={e => setAvailability({...availability, to: e.target.value})} className="p-1.5 rounded-lg border border-slate-200 text-[10px]"/></div><Button size="sm" className="mt-2" onClick={() => save('availability', availability)}>Save availability</Button></Card><Card className="p-4"><div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Trust Breakdown</h3></div>{trustParts.map(([label, value, max]) => <div key={label} className="mb-1.5"><div className="flex justify-between text-[9px]"><span>{label}</span><b>{value}/{max}</b></div><div className="h-1 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${value/max*100}%`}}/></div></div>)}</Card></div></div>;
  }

  if (pathname.startsWith('/exchanges')) {
    const stages = ['Requested','Accepted','Scheduled','In Progress','Completed'];
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6"><Card className="p-4"><div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Exchange Progress</h3><span className="ml-auto text-[10px] font-semibold text-emerald-700">{status}</span></div><div className="grid grid-cols-5 gap-1">{stages.map(stage => <button key={stage} onClick={() => { setStatus(stage); save('exchange', stage); }} className={`p-2 rounded-lg text-[9px] font-bold ${status === stage ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{stage}</button>)}</div><div className="mt-2 h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${(stages.indexOf(status)+1)*20}%`}}/></div></Card></div>;
  }

  if (pathname.startsWith('/notifications')) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6"><Card className="p-4"><div className="flex items-center gap-2 mb-2"><Bell className="w-4 h-4 text-emerald-600"/><h3 className="text-xs font-bold">Smart Notification Preferences</h3></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{Object.entries(notifications).map(([name,value]) => <label key={name} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 text-[10px] capitalize"><span>{name}</span><input type="checkbox" checked={value} onChange={e => setNotifications(n => ({...n, [name]: e.target.checked}))}/></label>)}</div><Button size="sm" className="mt-2" onClick={() => save('notifications', notifications)}>Save preferences</Button></Card></div>;
  }

  if (pathname.startsWith('/community') || pathname.startsWith('/messages')) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-6"><Card className="p-3"><div className="flex items-center gap-2 text-[10px] text-slate-500"><Flag className="w-4 h-4 text-amber-500"/><span>Community safety: use the existing report controls to flag inappropriate users or content.</span>{reportSent ? <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto"/> : <Button size="sm" variant="outline" onClick={() => { if (report.trim()) { setReportSent(true); setReport(''); } }}>Report</Button>}<input value={report} onChange={e => setReport(e.target.value)} placeholder="Brief reason" className="w-32 px-2 py-1 rounded-md border border-slate-200 text-[9px]"/></div></Card></div>;
  }

  return null;
};
