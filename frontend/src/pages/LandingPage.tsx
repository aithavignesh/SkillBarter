import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../services/analytics';
import { ArrowRight, ArrowUpRight, Compass, MessageCircle, ShieldCheck, Sparkles, Users, MapPin, BookOpen, BriefcaseBusiness, HeartHandshake, ChevronDown } from 'lucide-react';

const steps = [
  ['01', 'Tell us what you know', 'Add the skills you can teach and the skills you want to learn.'],
  ['02', 'Find the right person', 'Discover people by skill, interests, location and trust signals.'],
  ['03', 'Start learning', 'Talk, agree on a session and learn together.'],
];

const features = [
  { icon: Compass, title: 'Discover locally', text: 'Search for people and skills that are relevant to you.', detail: 'Find people and skills that are relevant to where you are and what you want to learn.' },
  { icon: Sparkles, title: 'Smart matching', text: 'Use compatibility signals to surface useful skill exchanges.', detail: 'Use skill compatibility and shared interests to surface people who can contribute something useful to your learning goals.' },
  { icon: MessageCircle, title: 'Keep it practical', text: 'Move from a match to a real conversation and scheduled exchange.', detail: 'Move from discovering a person to a real conversation, focused exchange and scheduled learning session.' },
  { icon: ShieldCheck, title: 'Build trust', text: 'Profiles, reviews and verification help members choose confidently.', detail: 'Profiles, reviews and verification give you more context before starting an exchange.' },
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

const MeetingPointVisual: React.FC = () => (
  <div className="relative mx-auto flex min-h-[390px] w-full max-w-[560px] flex-col items-center gap-3 px-2 text-center lg:mt-[-4px] lg:block lg:h-[390px]">
    <div className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a8290] lg:absolute lg:left-1/2 lg:top-0 lg:h-8 lg:-translate-x-1/2">Two skills, one exchange</div>

    <div className="order-1 relative flex h-[112px] w-full max-w-[290px] shrink-0 flex-col items-center justify-center rounded-[32px] border border-[rgba(126,143,151,.42)] bg-[rgba(181,193,195,.18)] lg:absolute lg:left-0 lg:top-12 lg:order-none lg:h-[270px] lg:w-[58%] lg:max-w-none lg:rounded-full lg:pr-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a8290]">You teach</p>
      <p className="mt-3 text-[clamp(1.15rem,2vw,1.5rem)] font-semibold tracking-[-0.03em] text-[#17233b]">Web Development</p>
      <span className="mt-3 h-px w-12 bg-[rgba(126,143,151,.42)] lg:mt-4" />
    </div>

    <div className="order-3 relative flex h-[112px] w-full max-w-[290px] shrink-0 flex-col items-center justify-center rounded-[32px] border border-[rgba(201,135,125,.4)] bg-[rgba(218,170,160,.22)] lg:absolute lg:right-0 lg:top-12 lg:order-none lg:h-[270px] lg:w-[58%] lg:max-w-none lg:rounded-full lg:pl-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a8290]">You learn</p>
      <p className="mt-3 text-[clamp(1.15rem,2vw,1.5rem)] font-semibold tracking-[-0.03em] text-[#17233b]">UI/UX Design</p>
      <span className="mt-3 h-px w-12 bg-[rgba(201,135,125,.4)] lg:mt-4" />
    </div>

    <div className="order-2 relative z-10 flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-[#f7f7f5] bg-[#17233b] text-white shadow-[0_8px_20px_rgba(23,35,59,.12)] ring-1 ring-[#17233b]/10 lg:absolute lg:left-1/2 lg:top-[145px] lg:order-none lg:h-[100px] lg:w-[100px] lg:-translate-x-1/2 lg:border-[7px]">
      <Users className="h-5 w-5 text-[#f7f7f5]" />
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]">Match</span>
    </div>

    <div className="order-4 relative flex items-center gap-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#7a8290] lg:absolute lg:bottom-3 lg:left-1/2 lg:order-none lg:-translate-x-1/2">
      <span className="h-px w-8 bg-[#17233b]/20" />
      <span>Learn together</span>
      <span className="h-px w-8 bg-[#d31d24]/30" />
    </div>
  </div>
);

type DetailItem = {
  label: string;
  text: string;
};

const InteractiveInfoBlock: React.FC<{
  label?: string;
  title: string;
  text: string;
  details: DetailItem[];
  dark?: boolean;
  className?: string;
}> = ({ label, title, text, details, dark = false, className = '' }) => {
  const [active, setActive] = useState(false);

  return (
    <div
      className={`${dark ? 'landing-outcome-block' : 'landing-step-block'} ${className} ${active ? 'landing-info-block--active' : ''}`}
      tabIndex={0}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClick={() => setActive((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActive((current) => !current);
        }
      }}
    >
      <div className="landing-info-block__summary">
        {label && <span className="landing-step-number">{label}</span>}
        <h3 className={dark ? 'landing-outcome-title' : undefined}>{title}</h3>
        <p className={dark ? 'landing-outcome-text' : undefined}>{text}</p>
      </div>
      <div className={`landing-info-block__details ${active ? 'landing-info-block__details--active' : ''}`} aria-hidden={!active}>
        <div className="landing-info-block__details-inner">
          {details.map(({ label, text: detailText }) => <div key={label} className="landing-info-block__detail">
            <span>{label}</span>
            <p>{detailText}</p>
          </div>)}
        </div>
      </div>
    </div>
  );
};

const PathwaySection: React.FC = () => (
  <div className="border-b border-[#dedfdd]">
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 px-5 sm:px-8 lg:grid-cols-3 lg:px-10">
        <InteractiveInfoBlock label="01" title="Tell us what you know" text="Add the skills you can teach and the skills you want to learn." details={[
            { label: 'WHAT YOU DO', text: 'Add skills you can confidently share and skills you want to learn.' },
            { label: 'WHY IT MATTERS', text: 'Your profile becomes easier to understand for people with complementary interests.' },
            { label: 'NEXT', text: 'Use those interests as a foundation for discovering relevant people.' },
          ]} />
        <InteractiveInfoBlock label="02" title="Find the right person" text="Discover people by skill, interests, location and trust signals." details={[
            { label: 'WHAT YOU DO', text: 'Review people whose skills, interests, location and trust signals fit your goals.' },
            { label: 'WHY IT MATTERS', text: 'Relevant context helps you choose a useful match instead of browsing at random.' },
            { label: 'NEXT', text: 'Start a conversation with someone who complements what you want to learn.' },
          ]} className="border-t border-[#e8e9e7] lg:border-l lg:border-t-0" />
        <InteractiveInfoBlock label="03" title="Start learning" text="Talk, agree on a session and learn together." details={[
            { label: 'WHAT YOU DO', text: 'Talk through what you want to learn and agree on a focused session.' },
            { label: 'WHY IT MATTERS', text: 'A clear exchange turns a promising match into practical peer learning.' },
            { label: 'NEXT', text: 'Begin the interaction and share knowledge in a way that works for both people.' },
          ]} className="border-t border-[#e8e9e7] lg:border-l lg:border-t-0" />
      </div>
    </section>
    <section className="bg-[#17233b] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
        <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          <InteractiveInfoBlock title="Teach what you know" text="Create a profile around the skills you are comfortable sharing." dark details={[
            { label: 'WHY IT MATTERS', text: 'Sharing an existing skill gives another member a practical starting point.' },
            { label: 'WHAT IT CREATES', text: 'A useful exchange built around something you can genuinely contribute.' },
          ]} className="border-t border-[#e8e9e7] lg:border-l lg:border-t-0" />
          <InteractiveInfoBlock title="Learn what matters" text="Find practical knowledge that helps with your goals, projects or career." dark details={[
            { label: 'WHAT YOU PURSUE', text: 'Focus on knowledge connected to your goals, projects or career.' },
            { label: 'WHY IT MATTERS', text: 'Practical learning is easier to apply when it starts with a real need.' },
          ]} />
          <InteractiveInfoBlock title="Meet useful people" text="Build relationships through real exchanges instead of passive scrolling." dark details={[
            { label: 'WHAT IT CREATES', text: 'Skill exchanges create a reason to connect around shared interests and goals.' },
            { label: 'NEXT', text: 'Build relationships through conversations and useful collaboration.' },
          ]} />
        </div>
      </div>
    </section>
  </div>
);

const ExploreOption: React.FC<{
  icon: React.ElementType;
  title: string;
  text: string;
  detail: string;
}> = ({ icon: Icon, title, text, detail }) => {
  const [active, setActive] = useState(false);

  return (
    <article
      className={`explore-option ${active ? 'explore-option--active' : ''}`}
      tabIndex={0}
      role="button"
      aria-expanded={active}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClick={() => setActive((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActive((current) => !current);
        }
      }}
    >
      <div className="explore-option__summary">
        <Icon aria-hidden="true" className="explore-option__icon" />
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="explore-option__detail">
        <p>{detail}</p>
      </div>
    </article>
  );
};

const ExploreTree: React.FC = () => (
  <div className="explore-options">
    <div className="explore-options__grid">
      {exchangeTypes.map(({ icon, title, text }, index) => (
        <ExploreOption
          key={title}
          icon={icon}
          title={title}
          text={text}
          detail={[
            'Find someone who already uses the skill you want to learn, then start a practical exchange around that goal.',
            'Add the skills you can confidently teach so other members can discover the value you can contribute.',
            'Connect through shared skills, interests and projects instead of simply browsing profiles.',
          ][index]}
        />
      ))}
    </div>
    <Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_explore_tree', action: 'signup' })} to={buildSignupPath()} className="explore-options__cta">
      Create your profile <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);

const FeatureGrid: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  return (
    <div
      className={`feature-grid ${activeFeature === null ? '' : 'feature-grid--has-active'}`}
      onMouseLeave={() => setActiveFeature(null)}
    >
      {features.map(({ icon: Icon, title, text, detail }, index) => {
        const active = activeFeature === index;
        const inactive = activeFeature !== null && !active;
        return (
          <div key={title} className="feature-grid__slot">
            <article
              className={`feature-card ${active ? 'feature-card--active' : ''} ${inactive ? 'feature-card--inactive' : ''}`}
              tabIndex={0}
              role="button"
              aria-expanded={active}
              onMouseEnter={() => setActiveFeature(index)}
              onFocus={() => setActiveFeature(index)}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget as Node)) {
                  setActiveFeature(null);
                }
              }}
              onClick={() => setActiveFeature((current) => current === index ? null : index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveFeature((current) => current === index ? null : index);
                }
              }}
            >
              <Icon aria-hidden="true" className="feature-card__icon" />
              <h3>{title}</h3>
              <p className="feature-card__text">{text}</p>
              <div className="feature-card__detail">
                <span>HOW IT HELPS</span>
                <p>{detail}</p>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
};

export const LandingPage: React.FC = () => (
  <main className="min-h-screen bg-[#f7f7f5] text-[#17233b]">
<section className="relative isolate overflow-hidden border-b border-[#dedfdd] bg-[#f7f7f5]">
  <div
    aria-hidden="true"
    className="landing-hero-background pointer-events-none absolute inset-0 z-0 bg-no-repeat"
    style={{
      backgroundImage:
        'linear-gradient(90deg, #f7f7f5 0%, rgba(247,247,245,.96) 24%, rgba(247,247,245,.5) 52%, rgba(247,247,245,0) 82%), url("/images/landingpageimage.png")',
    }}
  />

  <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-24 sm:px-8 sm:pt-28 lg:px-10 lg:pb-24 lg:pt-32">
    <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
      <div className="min-w-0 self-start">
        <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]"><span className="h-px w-8 bg-[#d31d24]" />Built for students & early-career learners</div>
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

          <div className="min-w-0 w-full lg:pt-2">
            <MeetingPointVisual />
          </div>
        </div>
      </div>
    </section>

    <PathwaySection />

    <section id="explore" className="border-b border-[#dedfdd] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl min-w-0 px-5 sm:px-8 lg:px-10">
        <div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">What can you do here?</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Start with the skill you need next.</h2><p className="mt-4 text-[13px] leading-6 text-[#707884]">Choose a career-relevant learning goal — development, AI/data, design, communication or interview preparation. Then add one skill you can teach so your profile can find complementary peers.</p></div>
        <ExploreTree />
      </div>
    </section>

    <section className="bg-[#f7f7f5] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl min-w-0 px-5 sm:px-8 lg:px-10">
        <div className="grid min-w-0 gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">Designed around peer learning</p><h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Your next skill can start with one person.</h2><p className="mt-5 max-w-md text-[13px] leading-6 text-[#707884]">The product is built around a simple journey: find a peer, start a focused learning exchange, then build trust through real sessions.</p><Link onClick={() => trackEvent('activation_cta_clicked', { source: 'landing_features', action: 'discover' })} to="/discover" className="mt-7 inline-flex items-center gap-2 text-[12px] font-bold text-[#17233b] hover:text-[#d31d24]">Find learning partners <ArrowUpRight className="h-4 w-4" /></Link></div>
          <FeatureGrid />
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
