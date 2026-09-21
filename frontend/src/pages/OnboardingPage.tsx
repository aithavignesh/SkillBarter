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
  const [locationName, setLocationName] = useState(currentUser?.address_display || '');
  const [headline, setHeadline] = useState(currentUser?.headline || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [exchangeRadius, setExchangeRadius] = useState<number>(currentUser?.exchange_radius_km || 10);
  const [primaryIntent, setPrimaryIntent] = useState<string>(currentUser?.primary_intent || 'LEARN');

  // Skill tags
  const [offeredSkills, setOfferedSkills] = useState<string[]>(['Web Development', 'Python']);
  const [neededSkills, setNeededSkills] = useState<string[]>(['AI / Machine Learning', 'Interview Preparation']);
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
    if (!locationName.trim()) { setStep(1); return; }
    if (offeredSkills.length === 0) { setStep(2); return; }
    if (neededSkills.length === 0) { setStep(3); return; }
    try {
      setLoading(true);
      await api.updateMe({
        address_display: locationName,
        headline: headline || `${neededSkills[0] || 'Skill'} learner • ${offeredSkills[0] || 'Skill'} contributor`,
        bio: bio || 'Student building practical skills through peer learning and skill exchange.',
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
      navigate('/matches');
    } catch (err) {
      console.error(err);
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    { num: 1, title: 'Location', desc: 'Where do you study or work?' },
    { num: 2, title: 'Teach', desc: 'What can you teach?' },
    { num: 3, title: 'Learn', desc: 'What do you want to learn?' },
    { num: 4, title: 'Preferences', desc: 'Set your learning preferences' },
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
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content Card */}
        <Card className="p-8">
          {/* STEP 1: Location */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 1 of 5 · Quick setup</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Where do you want to find learning partners?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Use your campus or city so we can surface relevant student peers. Your exact address is not shown.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus / Area
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Gachibowli, Hyderabad"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Privacy First</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    People see an approximate area or distance, not your exact residence.
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
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">What can you teach?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Start with skills you can confidently teach or help someone with. Think coding, AI, design, editing, communication, languages or hobbies.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="e.g. React, Python, Figma, Excel, Public Speaking..."
                  value={newOfferSkill}
                  onChange={(e) => setNewOfferSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOffer())}
                  className="w-full min-w-0 flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="button" size="sm" onClick={handleAddOffer} icon={<Plus className="w-4 h-4" />}>
                  Add Skill
                </Button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Skills I can teach:
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
                <label className="block text-[11px] text-slate-400 mb-1">Popular student skills:</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'React', 'AI / ML', 'Figma', 'Video Editing', 'Public Speaking', 'Excel'].map((s) => (
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
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">What do you want to learn?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose skills that would help with your studies, projects, portfolio or career. Add at least one so we can find a useful match.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Machine Learning, DSA, UI Design, Resume Review..."
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
                  Skills I want to learn:
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

          {/* STEP 4: Goal, radius & profile preview */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 4 of 4 · Almost there</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Set your learning preferences</h2>
                <p className="text-xs text-slate-500 mt-1">These are optional and help us make your first matches more relevant.</p>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">What are you here to achieve?</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { id: 'LEARN', label: 'Learn for My Goals', desc: 'Studies, projects or career' },
                    { id: 'EXCHANGE', label: 'Learn & Teach', desc: 'Exchange skills with another student' },
                    { id: 'TEACH', label: 'Teach & Share', desc: 'Help someone learn what you know' },
                    { id: 'MEET', label: 'Build My Network', desc: 'Meet peers around shared interests' },
                  ].map(item => <button key={item.id} type="button" onClick={() => setPrimaryIntent(item.id)} className={`rounded-xl border p-3 text-left transition-all ${primaryIntent === item.id ? 'border-emerald-500 bg-emerald-50/70' : 'border-slate-200 bg-white hover:border-slate-300'}`}><p className="text-xs font-bold text-slate-900">{item.label}</p><p className="mt-1 text-[10px] text-slate-500">{item.desc}</p></button>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">How far should we search?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 5, 10, 25].map(r => <button key={r} type="button" onClick={() => setExchangeRadius(r)} className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${exchangeRadius === r ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>{r} km</button>)}
                </div>
              </div>
              <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your profile is ready</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{currentUser?.full_name} · {locationName}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">Teaching: <span className="font-semibold text-emerald-700">{offeredSkills.join(', ')}</span></p>
                <p className="text-[11px] leading-5 text-slate-500">Learning: <span className="font-semibold text-teal-700">{neededSkills.join(', ')}</span></p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-col-reverse gap-3 pt-6 mt-6 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
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

            {step < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (step === 1 && !locationName.trim()) return;
                  if (step === 2 && offeredSkills.length === 0) return;
                  if (step === 3 && neededSkills.length === 0) return;
                  setStep(step + 1);
                }}
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
                Show My Learning Matches
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
