import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { Bell, Bookmark, Calendar, CheckCircle2, Clock, Filter, Flag, Heart, MapPin, Save, Search, ShieldCheck, Sparkles, Star, TrendingUp, Users, X } from 'lucide-react';

const storageKey = (key: string) => `skillbarter_daily_${key}`;
const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(storageKey(key)); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

export const DailyFeaturesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const offered = currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => s.skill_name) || [];
  const needed = currentUser?.skills?.filter(s => s.skill_type === 'NEEDED').map(s => s.skill_name) || [];

  const [bookmarks, setBookmarks] = useState<string[]>(() => read('bookmarks', []));
  const [availability, setAvailability] = useState(() => read('availability', { days: ['Mon', 'Wed', 'Fri'], from: '18:00', to: '21:00' }));
  const [notifications, setNotifications] = useState(() => read('notifications', { requests: true, exchanges: true, messages: true, recommendations: true }));
  const [exchangeStatus, setExchangeStatus] = useState(() => read('exchange_status', 'Requested'));
  const [skillQuery, setSkillQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('Any');
  const [distance, setDistance] = useState('25');
  const [report, setReport] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = (key: string, value: unknown) => { localStorage.setItem(storageKey(key), JSON.stringify(value)); setSaved(true); window.setTimeout(() => setSaved(false), 1600); };
  const addBookmark = () => { const skill = skillQuery.trim(); if (!skill) return; const next = Array.from(new Set([...bookmarks, skill])); setBookmarks(next); save('bookmarks', next); setSkillQuery(''); };
  const removeBookmark = (skill: string) => { const next = bookmarks.filter(x => x !== skill); setBookmarks(next); save('bookmarks', next); };
  const trust = Math.round(currentUser?.trust_score || 94);
  const trustParts = useMemo(() => ({ completed: Math.min(30, Math.round(trust * .30)), ratings: Math.min(25, Math.round(trust * .25)), verification: Math.min(25, Math.round(trust * .25)), activity: Math.min(20, Math.round(trust * .20)) }), [trust]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1"><Sparkles className="w-4 h-4" /> Daily Product Improvements</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">New SkillBarter Features</h1>
          <p className="text-xs text-slate-500 mt-1">Practical tools for discovering skills, arranging exchanges, and building trust.</p>
        </div>
        {saved && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl"><CheckCircle2 className="inline w-4 h-4 mr-1" />Saved</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-sm font-bold">1. Smart Recommendations</h2><p className="text-[11px] text-slate-500">Personalized from your current skill profile.</p></div><Sparkles className="w-5 h-5 text-emerald-600" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...needed.slice(0, 2), ...(needed.length ? [] : ['Web Development', 'Photography'])].map((skill, i) => (
              <div key={`${skill}-${i}`} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-800">{skill}</p><p className="text-[10px] text-slate-500">Recommended exchange partners</p></div><Link to="/matches" className="text-[10px] font-bold text-emerald-700">Explore →</Link></div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-bold">2. Personalized Dashboard</h2></div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3"><b className="text-lg">{needed.length}</b><p className="text-[10px] text-slate-500">Learning goals</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><b className="text-lg">{offered.length}</b><p className="text-[10px] text-slate-500">Teaching skills</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><b className="text-lg">{bookmarks.length}</b><p className="text-[10px] text-slate-500">Bookmarks</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><b className="text-lg text-emerald-700">{trust}</b><p className="text-[10px] text-slate-500">Trust score</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1"><Filter className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-bold">3. Advanced Skill Filters</h2></div>
          <p className="text-[11px] text-slate-500 mb-4">Prepare precise discovery searches before opening the marketplace.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="Skill name" className="w-full pl-9 p-2 rounded-xl border border-slate-200 text-xs" /></div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs"><option>All</option><option>Technology</option><option>Design</option><option>Education</option><option>Cooking</option><option>Fitness</option></select>
            <select value={level} onChange={e => setLevel(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs"><option>Any</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
            <select value={distance} onChange={e => setDistance(e.target.value)} className="p-2 rounded-xl border border-slate-200 text-xs col-span-2"><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="25">Within 25 km</option><option value="50">Within 50 km</option></select>
          </div>
          <Link to={`/discover?q=${encodeURIComponent(skillQuery)}`} className="inline-block mt-3"><Button size="sm" icon={<Search className="w-3.5 h-3.5" />}>Search Skills</Button></Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-bold">4. User Availability</h2></div>
          <p className="text-[11px] text-slate-500 mb-3">Set your preferred exchange windows.</p>
          <div className="flex flex-wrap gap-1.5 mb-3">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <button key={day} onClick={() => setAvailability((a: any) => ({...a, days: a.days.includes(day) ? a.days.filter((d: string) => d !== day) : [...a.days, day]}))} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${availability.days.includes(day) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{day}</button>)}</div>
          <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-slate-500">From<input type="time" value={availability.from} onChange={e => setAvailability({...availability, from: e.target.value})} className="block w-full p-2 rounded-lg border border-slate-200 text-xs" /></label><label className="text-[10px] text-slate-500">To<input type="time" value={availability.to} onChange={e => setAvailability({...availability, to: e.target.value})} className="block w-full p-2 rounded-lg border border-slate-200 text-xs" /></label></div>
          <Button size="sm" className="mt-3" onClick={() => save('availability', availability)} icon={<Save className="w-3.5 h-3.5" />}>Save Availability</Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1"><Heart className="w-5 h-5 text-rose-500" /><h2 className="text-sm font-bold">5. Bookmark Skills & Users</h2></div>
          <p className="text-[11px] text-slate-500 mb-3">Save skills you want to revisit.</p>
          <div className="flex gap-2"><input value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="Enter a skill to bookmark" className="flex-1 p-2 rounded-xl border border-slate-200 text-xs" /><Button size="sm" onClick={addBookmark} icon={<Bookmark className="w-3.5 h-3.5" />}>Save</Button></div>
          <div className="flex flex-wrap gap-1.5 mt-3">{bookmarks.length ? bookmarks.map(skill => <span key={skill} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg">{skill}<button onClick={() => removeBookmark(skill)}><X className="w-3 h-3" /></button></span>) : <span className="text-[11px] text-slate-400">No bookmarks yet.</span>}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1"><Calendar className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-bold">6. Exchange Progress Tracker</h2></div>
          <p className="text-[11px] text-slate-500 mb-3">Move an exchange through its lifecycle.</p>
          <div className="grid grid-cols-5 gap-1">{['Requested','Accepted','Scheduled','In Progress','Completed'].map(status => <button key={status} onClick={() => { setExchangeStatus(status); save('exchange_status', status); }} className={`rounded-lg p-2 text-[9px] font-bold ${exchangeStatus === status ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{status}</button>)}</div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(['Requested','Accepted','Scheduled','In Progress','Completed'].indexOf(exchangeStatus)+1)*20}%` }} /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5"><div className="flex items-center gap-2 mb-3"><Bell className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-bold">7. Smart Notifications</h2></div>{Object.entries(notifications).map(([key,value]) => <label key={key} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 text-xs"><span className="capitalize">{key}</span><input type="checkbox" checked={value} onChange={e => setNotifications(n => ({...n, [key]: e.target.checked}))} /></label>)}<Button size="sm" className="mt-3" onClick={() => save('notifications', notifications)}>Save Preferences</Button></Card>

        <Card className="p-5"><div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-emerald-600" /><h2 className="text-sm font-bold">8. Trust Score Breakdown</h2></div><div className="text-center mb-3"><span className="text-3xl font-black text-emerald-700">{trust}</span><span className="text-xs text-slate-400"> / 100</span></div>{[['Completed exchanges',trustParts.completed,30],['Ratings',trustParts.ratings,25],['Verification',trustParts.verification,25],['Activity',trustParts.activity,20]].map(([label,value,max]) => <div key={String(label)} className="mb-2"><div className="flex justify-between text-[10px]"><span>{label}</span><b>{value}/{max}</b></div><div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${Number(value)/Number(max)*100}%`}} /></div></div>)}</Card>

        <Card className="p-5"><div className="flex items-center gap-2 mb-3"><Flag className="w-5 h-5 text-amber-600" /><h2 className="text-sm font-bold">9. Report & Safety</h2></div><p className="text-[11px] text-slate-500 mb-2">Report inappropriate profiles, posts, or messages.</p><textarea value={report} onChange={e => setReport(e.target.value)} rows={3} placeholder="Describe the issue..." className="w-full p-2 rounded-xl border border-slate-200 text-xs resize-none" />{reportSent ? <p className="text-[10px] text-emerald-700 font-semibold mt-2"><CheckCircle2 className="inline w-3 h-3" /> Report saved for review.</p> : <Button size="sm" className="mt-2" disabled={!report.trim()} onClick={() => { setReportSent(true); setReport(''); }}>Submit Report</Button>}</Card>
      </div>

      <Card className="p-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /><h2 className="text-sm font-bold">10. Recently Viewed & Quick Actions</h2></div><p className="text-[11px] text-slate-500 mt-1">Jump back into the main workflows without losing context.</p></div><div className="flex flex-wrap gap-2"><Link to="/discover"><Button variant="outline" size="sm" icon={<Users className="w-3.5 h-3.5" />}>Discover People</Button></Link><Link to="/matches"><Button variant="outline" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>View Matches</Button></Link><Link to="/exchanges"><Button size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>My Exchanges</Button></Link></div></div></Card>
    </div>
  );
};
