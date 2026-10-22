"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Skill = { _id: string; name: string; category?: string };
type Profile = {
  fullName: string;
  username: string;
  bio?: string;
  headline?: string;
  skillsToTeach?: Skill[];
  skillsToLearn?: Skill[];
  trustScore?: number;
  reviewsCount?: number;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ user: Profile }>("/api/users/me");
      setProfile(data.user);
      setFullName(data.user.fullName || "");
      setHeadline(data.user.headline || "");
      setBio(data.user.bio || "");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load your profile.";
      if (/Authentication required|invalid or expired|unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await api<{ user: Profile }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName, headline, bio })
      });
      setProfile((current) => current ? { ...current, ...data.user } : data.user);
      setFullName(data.user.fullName || "");
      setHeadline(data.user.headline || "");
      setBio(data.user.bio || "");
      setSuccess("Your profile has been saved.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save your profile.";
      if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) {
        router.replace("/login");
        return;
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboardPage">
      <nav className="nav wrap">
        <Link className="brand" href="/">skill<span>barter</span></Link>
        <div className="navActions">
          <Link className="navLink" href="/matches">Discover</Link>
          <Link className="navLink" href="/exchanges">Exchanges</Link>
          <Link className="navLink" href="/dashboard">Dashboard</Link>
        </div>
      </nav>
      <section className="profileContent wrap">
        <p className="eyebrow">Your SkillBarter identity</p>
        <h1>Your profile.</h1>
        <p className="adminIntro">Tell the community what you do and what you can help others learn.</p>
        {error && <p className="formError" role="alert">{error}</p>}
        {success && <p className="matchNotice" role="status">{success}</p>}
        {loading ? <p className="emptyAdmin" role="status">Loading your profile…</p> : profile && (
          <div className="profileLayout">
            <form className="profileForm" onSubmit={save}>
              <label>Full name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" />
              </label>
              <label>Username
                <input value={profile.username} readOnly aria-describedby="username-help" />
              </label>
              <p className="pickerHint" id="username-help">Your username identifies you in the community and cannot be changed here.</p>
              <label>Headline
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160} placeholder="e.g. Frontend developer learning data science" />
              </label>
              <label>About you
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} rows={5} placeholder="Share your interests, experience, and what you enjoy teaching." />
                <span className="profileCharacterCount">{bio.length}/1000</span>
              </label>
              <button className="button" disabled={saving || !fullName.trim()}>{saving ? "Saving profile…" : "Save profile"} ↗</button>
            </form>
            <aside className="profileSummary">
              <div className="profileAvatar" aria-hidden="true">{fullName.trim().slice(0, 1).toUpperCase() || "S"}</div>
              <h2>{fullName || "Your name"}</h2>
              <p className="profileUsername">@{profile.username}</p>
              {headline && <p>{headline}</p>}
              <div className="profileMetrics">
                <div><strong>{profile.trustScore ?? 0}</strong><span>Trust score</span></div>
                <div><strong>{profile.reviewsCount ?? 0}</strong><span>Reviews</span></div>
              </div>
              <h3>Skills I can teach</h3>
              <div className="profileSkillList">{(profile.skillsToTeach || []).map((skill) => <span key={skill._id}>{skill.name}</span>)}</div>
              <h3>Skills I want to learn</h3>
              <div className="profileSkillList">{(profile.skillsToLearn || []).map((skill) => <span key={skill._id}>{skill.name}</span>)}</div>
              <Link className="textLink" href="/onboarding">Update my skills ↗</Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
