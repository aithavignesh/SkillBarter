"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Skill = { _id: string; id?: string; name: string; category?: string; description?: string };
type Profile = { fullName: string; skillsToTeach?: Skill[]; skillsToLearn?: Skill[] };

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [teach, setTeach] = useState<string[]>([]);
  const [learn, setLearn] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([requestJson("/api/users/me"), requestJson("/api/skills")])
      .then(([profileData, skillData]) => {
        if (!active) return;
        const current = profileData.user as Profile;
        const list = (skillData.skills || []) as Skill[];
        setProfile(current);
        setSkills(list);
        setTeach((current.skillsToTeach || []).map((s) => s._id || s.id || "").filter(Boolean));
        setLearn((current.skillsToLearn || []).map((s) => s._id || s.id || "").filter(Boolean));
      })
      .catch((e) => {
        if (e instanceof Error && /Authentication required|invalid or expired|unavailable/i.test(e.message)) router.replace("/login");
        else if (active) setError(e instanceof Error ? e.message : "Unable to load onboarding.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  const availableToLearn = useMemo(() => skills.filter((skill) => !teach.includes(skill._id)), [skills, teach]);

  function toggle(id: string, kind: "teach" | "learn") {
    const selected = kind === "teach" ? teach : learn;
    const setter = kind === "teach" ? setTeach : setLearn;
    const isSelected = selected.includes(id);
    setter((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 12 ? current : [...current, id]);
    if (!isSelected) {
      (kind === "teach" ? setLearn : setTeach)((current) => current.filter((item) => item !== id));
    }
  }

  async function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customSkill.trim();
    if (name.length < 2) return;
    setError("");
    try {
      const data = await requestJson("/api/skills", { method: "POST", body: JSON.stringify({ name, category: "Other" }) });
      const skill = data.skill as Skill;
      const id = skill._id || skill.id;
      if (!id) throw new Error("The API did not return a skill ID.");
      setSkills((current) => current.some((item) => item._id === id) ? current : [...current, { ...skill, _id: id }].sort((a, b) => a.name.localeCompare(b.name)));
      setTeach((current) => current.includes(id) ? current : [...current, id].slice(0, 12));
      setCustomSkill("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to add skill."); }
  }

  async function finish() {
    if (teach.length === 0 || learn.length === 0) {
      setError("Choose at least one skill to teach and one skill to learn.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await requestJson("/api/users/me", { method: "PATCH", body: JSON.stringify({ skillsToTeach: teach, skillsToLearn: learn, onboardingCompleted: true }) });
      router.replace("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save your profile."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="onboardingPage"><p>Loading your setup…</p></main>;

  return <main className="onboardingPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><span className="onboardingStep">YOUR FIRST STEP · 01 / 01</span></nav><section className="onboardingContent wrap"><p className="eyebrow">Make it yours</p><h1>{profile?.fullName ? `What will you share, ${profile.fullName.split(" ")[0]}?` : "What will you share?"}</h1><p className="onboardingIntro">Choose skills you can teach and skills you want to learn. This helps us shape relevant exchanges for you.</p>{error && <p className="formError" role="alert">{error}</p>}<div className="onboardingColumns"><section className="skillPicker"><div className="pickerHeader"><div><span className="pickerCount">01 · SHARE</span><h2>I can teach</h2><p>Pick up to 12 skills you can help others with.</p></div><span className="countPill">{teach.length}/12</span></div><div className="skillOptions">{skills.map((skill) => <button type="button" key={skill._id} className={`skillOption ${teach.includes(skill._id) ? "selected" : ""}`} onClick={() => toggle(skill._id, "teach")} aria-pressed={teach.includes(skill._id)}><span className="skillCheck">{teach.includes(skill._id) ? "✓" : "+"}</span><span>{skill.name}</span><small>{skill.category || "Other"}</small></button>)}</div><form className="addSkillForm" onSubmit={addCustom}><input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} maxLength={80} placeholder="Add a skill not listed…" aria-label="New skill name" /><button type="submit" disabled={customSkill.trim().length < 2}>Add</button></form></section><section className="skillPicker"><div className="pickerHeader"><div><span className="pickerCount">02 · DISCOVER</span><h2>I want to learn</h2><p>Select the skills you want to develop.</p></div><span className="countPill">{learn.length}/12</span></div><div className="skillOptions">{availableToLearn.map((skill) => <button type="button" key={skill._id} className={`skillOption ${learn.includes(skill._id) ? "selected" : ""} ${teach.includes(skill._id) ? "mutedOption" : ""}`} onClick={() => toggle(skill._id, "learn")} aria-pressed={learn.includes(skill._id)}><span className="skillCheck">{learn.includes(skill._id) ? "✓" : "+"}</span><span>{skill.name}</span><small>{skill.category || "Other"}</small></button>)}</div><p className="pickerHint">You can change your skills later from your profile.</p></section></div><div className="onboardingFooter"><p>Choose at least one skill in each column to continue.</p><button className="button" onClick={finish} disabled={saving}>{saving ? "Saving your skills…" : "Finish setup"} <span aria-hidden="true">↗</span></button></div></section></main>;
}
