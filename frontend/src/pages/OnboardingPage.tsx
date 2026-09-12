import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  MapPin,
  Wrench,
  HelpCircle,
  Target,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Plus,
  X
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Form State
  const [locationName, setLocationName] = useState(currentUser?.address_display || 'Hitech City, Hyderabad');
  const [headline, setHeadline] = useState(currentUser?.headline || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [exchangeRadius, setExchangeRadius] = useState<number>(currentUser?.exchange_radius_km || 10);
  const [primaryIntent, setPrimaryIntent] = useState<string>(currentUser?.primary_intent || 'EXCHANGE');

  // Skill tags
  const [offeredSkills, setOfferedSkills] = useState<string[]>(['Web Development', 'Photography']);
  const [neededSkills, setNeededSkills] = useState<string[]>(['Plumbing', 'Carpentry']);
  const [newOfferSkill, setNewOfferSkill] = useState('');
  const [newNeedSkill, setNewNeedSkill] = useState('');

  const handleAddOffer = () => {
    if (newOfferSkill.trim() && !offeredSkills.includes(newOfferSkill.trim())) {
      setOfferedSkills([...offeredSkills, newOfferSkill.trim()]);
      setNewOfferSkill('');
    }
  };

  const handleAddNeed = () => {
    if (newNeedSkill.trim() && !neededSkills.includes(newNeedSkill.trim())) {
      setNeededSkills([...neededSkills, newNeedSkill.trim()]);
      setNewNeedSkill('');
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      setLoading(true);
      await api.updateMe({
        address_display: locationName,
        headline: headline || `${offeredSkills[0] || 'Skill'} Enthusiast`,
        bio: bio || 'Excited to exchange skills with trusted local neighbors without money.',
        exchange_radius_km: exchangeRadius,
        primary_intent: primaryIntent,
        onboarding_completed: true,
      });

      // Save user skills
      for (const skill of offeredSkills) {
        try {
          await api.addUserSkill({ skill_name: skill, skill_type: 'OFFERED' });
        } catch {
          // ignore duplicates
        }
      }
      for (const skill of neededSkills) {
        try {
          await api.addUserSkill({ skill_name: skill, skill_type: 'NEEDED' });
        } catch {
          // ignore duplicates
        }
      }

      await refreshUser();
      navigate('/feed');
    } catch (err) {
      console.error(err);
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    { num: 1, title: 'Location', desc: 'Where are you based?' },
    { num: 2, title: 'Skills You Offer', desc: 'What can you trade or teach?' },
    { num: 3, title: 'Skills You Need', desc: 'What local help do you want?' },
    { num: 4, title: 'Your Goal', desc: 'What is your primary intent?' },
    { num: 5, title: 'Radius & Preview', desc: 'Set exchange distance' },
  ];

  return (
    <div className="min-h-[85vh] bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {stepTitles.map((s) => (
              <div
                key={s.num}
                className={`flex flex-col items-center flex-1 ${
                  step >= s.num ? 'text-emerald-700 font-bold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                    step === s.num
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-100'
                      : step > s.num
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="text-[10px] hidden sm:block truncate">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content Card */}
        <Card className="p-8">
          {/* STEP 1: Location */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 1 of 5</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Confirm Your Neighborhood</h2>
                <p className="text-xs text-slate-500 mt-1">
                  SkillBarter uses approximate neighborhood geo-fencing. Your exact coordinates are never shown to neighbors.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Neighborhood / Area Name
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Hitech City, Hyderabad"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Privacy First</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Other neighbors will see "1.8 km away" or "Hitech City", but will never see your home street or exact residence.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Skills I Offer */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 2 of 5</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">What Skills Can You Offer?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add skills or services you can trade (e.g. Web Development, Plumbing, Cooking, Piano, Yoga).
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter a skill (e.g. Bike Repair, Guitar, UI Design)..."
                  value={newOfferSkill}
                  onChange={(e) => setNewOfferSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOffer())}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="button" size="sm" onClick={handleAddOffer} icon={<Plus className="w-4 h-4" />}>
                  Add Skill
                </Button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Skills You Offer:
                </label>
                <div className="flex flex-wrap gap-2">
                  {offeredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      {skill}
                      <button
                        type="button"
                        onClick={() => setOfferedSkills(offeredSkills.filter(s => s !== skill))}
                        className="hover:text-rose-600 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Quick Add Suggestions:</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Web Development', 'Plumbing', 'Electrical Work', 'Graphic Design', 'Photography', 'Italian Cooking', 'Yoga'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => !offeredSkills.includes(s) && setOfferedSkills([...offeredSkills, s])}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Skills I Need */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 3 of 5</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">What Skills Do You Need?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  List what services or knowledge you would love to barter for from nearby neighbors.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter a skill you need (e.g. Carpentry, Gardening, Python)..."
                  value={newNeedSkill}
                  onChange={(e) => setNewNeedSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNeed())}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="button" size="sm" onClick={handleAddNeed} icon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Skills You Need:
                </label>
                <div className="flex flex-wrap gap-2">
                  {neededSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200"
                    >
                      <HelpCircle className="w-3 h-3 text-teal-600" />
                      {skill}
                      <button
                        type="button"
                        onClick={() => setNeededSkills(neededSkills.filter(s => s !== skill))}
                        className="hover:text-rose-600 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Primary Intent */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 4 of 5</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">What is Your Primary Goal?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  How do you plan to interact with your local neighborhood?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'EXCHANGE', label: 'Skill Barter', desc: 'Reciprocal 1-for-1 skill trade with zero cash' },
                  { id: 'LEARN', label: 'Learn a New Skill', desc: 'Find mentors and experienced practitioners nearby' },
                  { id: 'TEACH', label: 'Teach & Mentor', desc: 'Share your craft, hobby, or professional skills' },
                  { id: 'HELP', label: 'Community Service', desc: 'Lend a helping hand to neighbors in need' },
                  { id: 'MEET', label: 'Meet Neighbors', desc: 'Connect locally with friendly, skilled residents' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPrimaryIntent(item.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      primaryIntent === item.id
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Radius & Profile Preview */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 5 of 5</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Set Exchange Radius</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose how far you are willing to travel for physical and hands-on skill exchanges.
                </p>
              </div>

              {/* Radius Options */}
              <div className="grid grid-cols-4 gap-3">
                {[2, 5, 10, 25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setExchangeRadius(r)}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      exchangeRadius === r
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>

              {/* Profile Preview */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Profile Preview
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{currentUser?.full_name}</h4>
                    <p className="text-xs text-slate-500">{locationName} • {exchangeRadius} km radius</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-xs">
                  <div className="mb-2">
                    <span className="font-semibold text-slate-700">Offers: </span>
                    <span className="text-emerald-700 font-medium">{offeredSkills.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Needs: </span>
                    <span className="text-teal-700 font-medium">{neededSkills.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : <div />}

            {step < 5 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep(step + 1)}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                loading={loading}
                onClick={handleCompleteOnboarding}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Enter My Community
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
