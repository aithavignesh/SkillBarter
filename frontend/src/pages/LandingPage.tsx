import React from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Lock,
  Compass,
  Star,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const LandingPage: React.FC = () => {
  const barterExamples = [
    {
      personA: { name: 'Arjun', skill: 'Web Development', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', trust: 94 },
      personB: { name: 'Ravi', skill: 'Plumbing & Repairs', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', trust: 94 },
      distance: '1.8 km away',
      saved: 'Zero Cash Spent'
    },
    {
      personA: { name: 'Priya', skill: 'Portrait Photography', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', trust: 96 },
      personB: { name: 'Suresh', skill: 'Custom Carpentry', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', trust: 92 },
      distance: '3.1 km away',
      saved: 'Zero Cash Spent'
    },
    {
      personA: { name: 'Ananya', skill: 'UI / UX Design', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', trust: 91 },
      personB: { name: 'Deepa', skill: 'Artisanal Sourdough Baking', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80', trust: 95 },
      distance: '2.4 km away',
      saved: 'Zero Cash Spent'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Geofence / Zero-Cash pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hyperlocal Community Barter • Zero Cash Exchanged</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              Turn Your Skills Into Something <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Valuable.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect with verified neighbors nearby, exchange hands-on services and talents, and get things done without spending a single dollar. Governed by a community trust score.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto shadow-md" icon={<ArrowRight className="w-4 h-4" />}>
                  Join Your Community
                </Button>
              </Link>
              <Link to="/discover">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" icon={<Compass className="w-4 h-4" />}>
                  Explore Local Skills
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Zero-Cash Policy
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" /> Approximate Geo-Fencing
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" /> Algorithmic Trust Scores
              </span>
            </div>
          </div>

          {/* Interactive Barter Exchange Showcase */}
          <div className="mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {barterExamples.map((ex, i) => (
              <Card key={i} hover className="p-5 relative overflow-hidden bg-white/90 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4 pb-3 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <MapPin className="w-3.5 h-3.5" /> {ex.distance}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                    {ex.saved}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Person A */}
                  <div className="flex items-center gap-3">
                    <img src={ex.personA.avatar} alt={ex.personA.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900">{ex.personA.name}</p>
                      <p className="text-[11px] text-emerald-700 font-medium truncate">Offers: {ex.personA.skill}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">★ {ex.personA.trust}</span>
                  </div>

                  {/* Barter Icon */}
                  <div className="flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                      <Repeat className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Person B */}
                  <div className="flex items-center gap-3">
                    <img src={ex.personB.avatar} alt={ex.personB.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900">{ex.personB.name}</p>
                      <p className="text-[11px] text-teal-700 font-medium truncate">Offers: {ex.personB.skill}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">★ {ex.personB.trust}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Simple 5-Step Process</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">How SkillBarter Works</h2>
            <p className="text-sm text-slate-600 mt-2">
              Trading physical and intellectual talents with nearby neighbors in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Create Profile', desc: 'Set your neighborhood location and list what you can offer and what you need.' },
              { step: '02', title: 'Discover Nearby', desc: 'Browse geo-fenced neighbors within 2 to 25 km sorted by exact proximity.' },
              { step: '03', title: 'Propose Barter', desc: 'Send a structured skill-for-skill barter proposal with preferred times.' },
              { step: '04', title: 'Deliver & Chat', desc: 'Coordinate in real-time chat, meet locally, and mark completion mutually.' },
              { step: '05', title: 'Earn Trust', desc: 'Rate reliability and skill delivery to increase your dynamic community score.' },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 relative">
                <span className="text-2xl font-black text-emerald-600/40 mb-2 block font-mono">{item.step}</span>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SkillBarter / Core Differentiation */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Pure Peer-to-Peer</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1 mb-4 leading-tight">
                Why Pay For Services When You Can Exchange What You Know?
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                LinkedIn connects you to recruiters for corporate jobs. SkillBarter connects you to the plumber down the street who wants a simple website, or the neighbor who bakes bread and needs their bicycle gears tuned.
              </p>

              <div className="space-y-3.5">
                {[
                  { title: 'Zero Cash, Zero Fees', desc: 'No transaction cuts, subscription gates, or cash payments. Pure reciprocity.' },
                  { title: 'Hyperlocal Geofenced Radius', desc: 'Filter trades within walking or short driving distance for real-world convenience.' },
                  { title: 'Algorithmic Trust Score', desc: 'Built-in 0–100 reputation calculated from completion reliability and reviews.' },
                  { title: 'Safe & Moderated', desc: 'Community safety tools including instant reporting, blocking, and admin oversight.' },
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{point.title}</h4>
                      <p className="text-xs text-slate-500">{point.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual reputation card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Arjun Sharma</h3>
                  <p className="text-xs text-slate-500">Web Developer & Photographer • Hitech City</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600 font-mono">94</span>
                  <span className="text-xs text-slate-400">/100</span>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">High Trust</p>
                </div>
              </div>

              <div className="space-y-3 text-xs mb-6">
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Completion Reliability</span>
                    <span>95%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '95%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Skill Delivery Quality</span>
                    <span>94%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: '94%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Response Rate</span>
                    <span>98%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: '98%' }} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                  ✓ Verified Member
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  ★ Reliable Exchanger
                </span>
                <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-[11px] font-semibold border border-sky-200">
                  🏆 Top Contributor
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Your Neighborhood Has Skills. Start Connecting Today.
          </h2>
          <p className="text-emerald-100/90 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            Trade plumbing for web design, photography for carpentry, and build lasting neighborhood trust without spending a rupee.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl" icon={<Repeat className="w-4 h-4" />}>
              Create Your Skill Profile
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
