import React from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../services/analytics';
import { ArrowRight, ArrowUpRight, Check, Compass, MessageCircle, Repeat, ShieldCheck, Sparkles, Users, MapPin, BookOpen, BriefcaseBusiness, HeartHandshake, ChevronDown } from 'lucide-react';

const steps = [
  ['01', 'Tell us what you know', 'Add the skills you can teach and the skills you want to learn.'],
  ['02', 'Find the right person', 'Discover people by skill, interests, location and trust signals.'],
  ['03', 'Start learning', 'Talk, agree on a session and learn together.'],
];

const features = [
  { icon: Compass, title: 'Discover locally', text: 'Search for people and skills that are relevant to you.' },
  { icon: Sparkles, title: 'Smart matching', text: 'Use compatibility signals to surface useful skill exchanges.' },
  { icon: MessageCircle, title: 'Keep it practical', text: 'Move from a match to a real conversation and scheduled exchange.' },
  { icon: ShieldCheck, title: 'Build trust', text: 'Profiles, reviews and verification help members choose confidently.' },
];

const exchangeTypes = [
  { icon: BookOpen, title: 'Learn a skill', text: 'Pick up practical skills from someone who already uses them.' },
  { icon: BriefcaseBusiness, title: 'Share your expertise', text: 'Turn what you know into useful value for another member.' },
  { icon: HeartHandshake, title: 'Grow your network', text: 'Meet people around shared interests, projects and goals.' },
];

const faqs = [
  ['Do I need to pay to start?', 'No. SkillBarter is designed around skill-for-skill exchanges, so you can create a profile and start exploring without making money the starting point.'],
  ['What can I exchange?', 'Anything practical that another member can learn from you: coding, design, languages, fitness, communication, music, career skills and many other areas.'],
  ['How do I choose someone to exchange with?', 'Review their profile, skills, location and available trust signals, then start a conversation before proposing an exchange.'],
  ['Can I use SkillBarter for professional growth?', 'Yes. You can use exchanges for portfolio feedback, interview preparation, project guidance, tools, creative skills and peer learning.'],
];

const buildSignupPath = () => {
  const params = new URLSearchParams(window.location.search);
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'];
  const query = allowed
    .filter((key) => params.get(key))
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params.get(key) as string)}`)
    .join('&');
  return query ? `/signup?${query}` : '/signup';
};

export const LandingPage: React.FC = () => (
  <main className="min-h-screen bg-[#f7f7f5] text-[#17233b]">
    <section className="border-b border-[#dedfdd] bg-[#f7f7f5]">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 lg:px-10 lg:pb-24 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]"><span className="h-px w-8 bg-[#d31d24]" />Built for students & early-career learners</div>
            <h1 className="mt-7 max-w-4xl text-[clamp(3rem,6.4vw,6.2rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#17233b]">Find someone who can teach you.<br /><span className="text-[#d31d24]">Teach what you know.</span></h1>
            <p className="mt-8 max-w-xl text-[16px] leading-7 text-[#5d6675] sm:text-[18px]">SkillBarter helps students and early-career learners find peers who can teach what they want to learn — while giving them a way to share the skills they already know.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_hero', action: 'signup' })} to={buildSignupPath()} className="inline-flex items-center gap-2 bg-[#d31d24] px-5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#b8171d]">Find a learning partner <ArrowRight className="h-4 w-4" /></Link>
              <Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_hero', action: 'discover' })} to="/discover" className="inline-flex items-center gap-2 border border-[#cfd2d1] bg-transparent px-5 py-3 text-[13px] font-bold text-[#17233b] hover:border-[#17233b]">Explore learning skills <Compass className="h-4 w-4" /></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-[11px] font-medium text-[#7a8290]">
              <span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5" /> People first</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Local discovery</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Trust-aware</span>
            </div>
          </div>

          <div className="w-full lg:pt-2">
            <div className="border border-[#d9dbd9] bg-white shadow-[0_18px_50px_rgba(23,35,59,0.07)]">
              <div className="flex items-center justify-between border-b border-[#e8e9e7] px-5 py-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a9099]">A typical exchange</p><p className="mt-1 text-[15px] font-semibold text-[#17233b]">One student learns. One student contributes.</p></div>
                <span className="text-[10px] font-bold text-[#d31d24]">SKILLBARTER</span>
              </div>
              <div className="divide-y divide-[#ececea]">
                <div className="flex gap-4 p-5 sm:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f1f2f0] text-[#17233b]"><Users className="h-4 w-4" /></div><div><p className="text-[12px] font-bold text-[#17233b]">A student wants to learn React</p><p className="mt-1 text-[12px] leading-5 text-[#6d7582]">They can offer UI/UX feedback and portfolio reviews in return.</p></div></div>
                <div className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa0a8]"><span className="h-px flex-1 bg-[#e4e5e3]" /><Repeat className="h-4 w-4 text-[#d31d24]" /><span className="h-px flex-1 bg-[#e4e5e3]" /></div>
                <div className="flex gap-4 p-5 sm:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#fff0f0] text-[#d31d24]"><Sparkles className="h-4 w-4" /></div><div><p className="text-[12px] font-bold text-[#17233b]">Another student can offer UI/UX feedback</p><p className="mt-1 text-[12px] leading-5 text-[#6d7582]">SkillBarter helps them discover the match, start a conversation and plan the exchange.</p></div></div>
              </div>
              <div className="border-t border-[#e8e9e7] bg-[#fafaf8] px-5 py-4"><div className="flex items-center justify-between"><span className="text-[11px] text-[#7a8290]">Start with a learning goal</span><span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#17233b]"><Check className="h-3.5 w-3.5 text-[#d31d24]" /> Mutual value</span></div></div>
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

    <section className="border-b border-[#dedfdd] bg-[#17233b] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
        <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          {[
            ['Teach what you know', 'Create a profile around the skills you are comfortable sharing.'],
            ['Learn what matters', 'Find practical knowledge that helps with your goals, projects or career.'],
            ['Meet useful people', 'Build relationships through real exchanges instead of passive scrolling.'],
          ].map(([title, text]) => <div key={title} className="bg-[#17233b] p-7 sm:p-8"><p className="text-[13px] font-bold text-white">{title}</p><p className="mt-2 text-[12px] leading-5 text-[#c3c9d3]">{text}</p></div>)}
        </div>
      </div>
    </section>

    <section className="border-b border-[#dedfdd] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">What can you do here?</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Start with the skill you need next.</h2><p className="mt-4 text-[13px] leading-6 text-[#707884]">Choose a career-relevant learning goal — development, AI/data, design, communication or interview preparation. Then add one skill you can teach so your profile can find complementary peers.</p></div>
        <div className="mt-10 grid gap-px border border-[#dfe1df] bg-[#dfe1df] md:grid-cols-3">
          {exchangeTypes.map(({ icon: Icon, title, text }) => <div key={title} className="bg-white p-7 sm:p-8"><Icon className="h-5 w-5 text-[#d31d24]" /><h3 className="mt-7 text-[16px] font-semibold">{title}</h3><p className="mt-2 text-[12px] leading-5 text-[#747c87]">{text}</p><Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_exchange_type', action: 'signup' })} to="/signup" className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#17233b] hover:text-[#d31d24]">Create your profile <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>)}
        </div>
      </div>
    </section>

    <section className="bg-[#f7f7f5] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">Designed around peer learning</p><h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Your next skill can start with one person.</h2><p className="mt-5 max-w-md text-[13px] leading-6 text-[#707884]">The product is built around a simple journey: find a peer, start a focused learning exchange, then build trust through real sessions.</p><Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_features', action: 'discover' })} to="/discover" className="mt-7 inline-flex items-center gap-2 text-[12px] font-bold text-[#17233b] hover:text-[#d31d24]">Find learning partners <ArrowUpRight className="h-4 w-4" /></Link></div>
          <div className="grid gap-px border border-[#dfe1df] bg-[#dfe1df] sm:grid-cols-2">{features.map(({ icon: Icon, title, text }) => <div key={title} className="bg-white p-7"><Icon className="h-5 w-5 text-[#d31d24]" /><h3 className="mt-7 text-[15px] font-semibold">{title}</h3><p className="mt-2 text-[12px] leading-5 text-[#747c87]">{text}</p></div>)}</div>
        </div>
      </div>
    </section>

    <section className="border-y border-[#dedfdd] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="text-center"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">Questions before you join?</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">A few things people usually ask.</h2></div>
        <div className="mt-10 divide-y divide-[#e5e7e5] border-y border-[#e5e7e5]">
          {faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[14px] font-semibold text-[#17233b]"><span>{question}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#8b929d] transition-transform group-open:rotate-180" /></summary><p className="mt-3 max-w-3xl pr-8 text-[12px] leading-6 text-[#737b87]">{answer}</p></details>)}
        </div>
      </div>
    </section>

    <section className="bg-[#17233b] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-16">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3a1a4]">START WITH THE BETA</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your next skill could come from someone you already have something to teach.</h2><p className="mt-3 max-w-xl text-[13px] leading-6 text-[#c3c9d3]">Create your profile, choose what you can teach and what you want to learn, then discover people with complementary skills.</p></div>
        <Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_beta_cta', action: 'signup' })} to="/signup" className="inline-flex shrink-0 items-center gap-2 bg-white px-5 py-3 text-[13px] font-bold text-[#17233b] hover:bg-[#f2f3f1]">Create your profile <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  </main>
);
