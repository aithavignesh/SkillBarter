import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Compass, MessageCircle, Repeat, ShieldCheck, Sparkles, Users, MapPin } from 'lucide-react';

const steps = [
  ['01', 'Tell us what you know', 'Add the skills you can teach and the skills you want to learn.'],
  ['02', 'Find the right person', 'Discover people by skill, interests, location and trust signals.'],
  ['03', 'Make an exchange', 'Talk, agree on the session and exchange knowledge without cash.'],
];

const features = [
  { icon: Compass, title: 'Discover locally', text: 'Search for people and skills that are relevant to you.' },
  { icon: Sparkles, title: 'Smart matching', text: 'Use compatibility signals to surface useful skill exchanges.' },
  { icon: MessageCircle, title: 'Keep it practical', text: 'Move from a match to a real conversation and scheduled exchange.' },
  { icon: ShieldCheck, title: 'Build trust', text: 'Profiles, reviews and verification help members choose confidently.' },
];

export const LandingPage: React.FC = () => (
  <main className="min-h-screen bg-[#f7f7f5] text-[#17233b]">
    <section className="border-b border-[#dedfdd] bg-[#f7f7f5]">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 lg:px-10 lg:pb-24 lg:pt-16">
        <div className="grid items-end gap-12 lg:grid-cols-[1.08fr_.92fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]"><span className="h-px w-8 bg-[#d31d24]" />Community skill exchange</div>
            <h1 className="mt-7 max-w-4xl text-[clamp(3rem,7vw,6.8rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#17233b]">Trade skills.<br /><span className="text-[#d31d24]">Build people.</span></h1>
            <p className="mt-8 max-w-xl text-[16px] leading-7 text-[#5d6675] sm:text-[18px]">SkillBarter connects people who can teach what you need with people who want to learn what you know — without making money the starting point.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 bg-[#d31d24] px-5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#b8171d]">Start exchanging <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/discover" className="inline-flex items-center gap-2 border border-[#cfd2d1] bg-transparent px-5 py-3 text-[13px] font-bold text-[#17233b] hover:border-[#17233b]">Explore skills <Compass className="h-4 w-4" /></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-[11px] font-medium text-[#7a8290]">
              <span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5" /> People first</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Local discovery</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Trust-aware</span>
            </div>
          </div>

          <div className="lg:pb-2">
            <div className="border border-[#d9dbd9] bg-white">
              <div className="flex items-center justify-between border-b border-[#e8e9e7] px-5 py-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a9099]">A typical exchange</p><p className="mt-1 text-[15px] font-semibold text-[#17233b]">One person teaches. One person learns.</p></div>
                <span className="text-[10px] font-bold text-[#d31d24]">SKILLBARter</span>
              </div>
              <div className="divide-y divide-[#ececea]">
                <div className="flex gap-4 p-5 sm:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f1f2f0] text-[#17233b]"><Users className="h-4 w-4" /></div><div><p className="text-[12px] font-bold text-[#17233b]">A designer wants to learn React</p><p className="mt-1 text-[12px] leading-5 text-[#6d7582]">They can offer UI/UX feedback and portfolio reviews in return.</p></div></div>
                <div className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa0a8]"><span className="h-px flex-1 bg-[#e4e5e3]" /><Repeat className="h-4 w-4 text-[#d31d24]" /><span className="h-px flex-1 bg-[#e4e5e3]" /></div>
                <div className="flex gap-4 p-5 sm:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#fff0f0] text-[#d31d24]"><Sparkles className="h-4 w-4" /></div><div><p className="text-[12px] font-bold text-[#17233b]">A developer wants design feedback</p><p className="mt-1 text-[12px] leading-5 text-[#6d7582]">SkillBarter helps them discover the match, start a conversation and plan the exchange.</p></div></div>
              </div>
              <div className="border-t border-[#e8e9e7] bg-[#fafaf8] px-5 py-4"><div className="flex items-center justify-between"><span className="text-[11px] text-[#7a8290]">No cash required to start</span><span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#17233b]"><Check className="h-3.5 w-3.5 text-[#d31d24]" /> Mutual value</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-b border-[#dedfdd] bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 px-5 sm:px-8 lg:grid-cols-3 lg:px-10">
        {steps.map(([number, title, text], index) => <div key={number} className={`py-9 lg:px-8 ${index > 0 ? 'border-t border-[#e8e9e7] lg:border-l lg:border-t-0' : ''}`}><span className="text-[11px] font-bold tracking-[0.14em] text-[#d31d24]">{number}</span><h2 className="mt-5 text-[18px] font-semibold tracking-[-0.02em]">{title}</h2><p className="mt-2 max-w-sm text-[12px] leading-5 text-[#737b87]">{text}</p></div>)}
      </div>
    </section>

    <section className="bg-[#f7f7f5] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">Designed around the exchange</p><h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Everything important happens between people.</h2><p className="mt-5 max-w-md text-[13px] leading-6 text-[#707884]">The product is built to get out of the way: discover, talk, exchange and build a reputation over time.</p><Link to="/discover" className="mt-7 inline-flex items-center gap-2 text-[12px] font-bold text-[#17233b] hover:text-[#d31d24]">See the community <ArrowUpRight className="h-4 w-4" /></Link></div>
          <div className="grid gap-px border border-[#dfe1df] bg-[#dfe1df] sm:grid-cols-2">{features.map(({ icon: Icon, title, text }) => <div key={title} className="bg-white p-7"><Icon className="h-5 w-5 text-[#d31d24]" /><h3 className="mt-7 text-[15px] font-semibold">{title}</h3><p className="mt-2 text-[12px] leading-5 text-[#747c87]">{text}</p></div>)}</div>
        </div>
      </div>
    </section>

    <section className="bg-[#17233b] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-16">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3a1a4]">Ready when you are</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Bring one useful skill to the table.</h2><p className="mt-3 max-w-xl text-[13px] leading-6 text-[#c3c9d3]">Create your profile and find someone you can help — and someone who can help you.</p></div>
        <Link to="/signup" className="inline-flex shrink-0 items-center gap-2 bg-white px-5 py-3 text-[13px] font-bold text-[#17233b] hover:bg-[#f2f3f1]">Create your profile <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  </main>
);
