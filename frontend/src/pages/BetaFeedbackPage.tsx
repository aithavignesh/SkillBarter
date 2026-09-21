import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Button } from '../components/ui/Button';
import { trackEvent } from '../services/analytics';
import { MessageSquare, Send, CheckCircle2, Bug, Lightbulb, ThumbsUp } from 'lucide-react';

export const BetaFeedbackPage: React.FC = () => {
  const [type, setType] = useState<'GENERAL' | 'BUG' | 'IDEA'>('GENERAL');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    trackEvent('beta_feedback_submitted', { feedback_type: type.toLowerCase(), rating: rating ?? undefined, message_length: message.trim().length });
    setSent(true); setMessage('');
  };

  return <AppPageShell eyebrow="Beta feedback" title="Help us improve the first learning exchange" description="Tell us what worked, what felt confusing, or what would make SkillBarter more useful. Short feedback is enough." icon={<MessageSquare className="h-3.5 w-3.5" />} actions={<Link to="/feed"><Button size="sm" variant="outline">Back to learning feed</Button></Link>}>
    {sent ? <div className="border border-emerald-200 bg-emerald-50 p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><h2 className="mt-3 text-base font-bold text-[#17233b]">Thanks for the feedback.</h2><p className="mt-1 text-xs text-slate-600">Your response will help us improve the beta experience.</p><div className="mt-5"><Button size="sm" onClick={() => setSent(false)}>Send another response</Button></div></div> :
    <form onSubmit={submit} className="grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] lg:grid-cols-[1fr_1fr]">
      <div className="bg-white p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">1. What kind of feedback?</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{[['GENERAL','General',MessageSquare],['BUG','Something is broken',Bug],['IDEA','Feature idea',Lightbulb]].map(([value,label,Icon]) => <button key={String(value)} type="button" onClick={() => setType(value as typeof type)} className={'border p-3 text-left '+(type===value?'border-[#d31d24] bg-[#fff7f7]':'border-[#e1e4e8] bg-white')}><Icon className="h-4 w-4 text-[#d31d24]" /><span className="mt-2 block text-[11px] font-bold text-[#17233b]">{String(label)}</span></button>)}</div>
      <p className="mt-7 text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">2. How was your experience?</p><div className="mt-3 flex gap-2">{[1,2,3,4,5].map(value => <button key={value} type="button" onClick={() => setRating(value)} className={'flex h-9 w-9 items-center justify-center border text-xs font-bold '+(rating===value?'border-[#d31d24] bg-[#d31d24] text-white':'border-[#e1e4e8] bg-white text-slate-600')}>{value}</button>)}</div><p className="mt-2 text-[10px] text-slate-400">1 = frustrating · 5 = very useful</p></div>
      <div className="bg-[#f8f9f8] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">3. Tell us what happened</p><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={8} placeholder="Example: I found a good match, but I wasn't sure what to write in the first request..." className="mt-4 w-full resize-none border border-[#dfe3e7] bg-white p-3 text-xs leading-5 text-[#17233b] outline-none focus:border-[#c8cdd5]" /><p className="mt-2 text-[10px] text-slate-400">Please avoid sharing passwords, OTPs or other sensitive information.</p><Button type="submit" size="sm" className="mt-4" icon={<Send className="h-3.5 w-3.5" />}>Send beta feedback</Button></div>
    </form>}
    <div className="mt-4 border border-[#e1e4e8] bg-white p-5"><div className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-[#d31d24]" /><p className="text-xs font-bold text-[#17233b]">Best feedback to send</p></div><p className="mt-2 text-[11px] leading-5 text-slate-500">Tell us where you got stuck, whether you found someone relevant, what made you trust a profile, and what happened after sending or receiving a learning request.</p></div>
  </AppPageShell>;
};