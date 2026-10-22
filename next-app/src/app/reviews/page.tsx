"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Review = { _id: string; rating: number; comment: string; createdAt: string; reviewer?: { fullName: string; username: string } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUserId(params.get("user") || "");
    setExchangeId(params.get("exchange") || "");
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setReviewsLoading(true);
    setError("");
    api<{ reviews: Review[] }>(`/api/reviews/user/${userId}`).then((data) => { if (active) setReviews(data.reviews); })
      .catch((e) => {
        if (!active) return;
        const message = e instanceof Error ? e.message : "Unable to load reviews.";
        if (/Authentication required|invalid or expired|unavailable/i.test(message)) router.replace("/login");
        else setError(message);
      })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [userId, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exchangeId) { setError("Open this page from a completed exchange to leave a review."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      await api("/api/reviews", { method: "POST", body: JSON.stringify({ exchangeId, rating, comment }) });
      setSuccess("Your review has been submitted.");
      setComment("");
      if (userId) {
        const data = await api<{ reviews: Review[] }>(`/api/reviews/user/${userId}`);
        setReviews(data.reviews);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit review."); }
    finally { setBusy(false); }
  }

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><div className="navActions"><Link className="navLink" href="/exchanges">Exchanges</Link><Link className="navLink" href="/dashboard">Dashboard</Link></div></nav><section className="reviewsContent wrap"><p className="eyebrow">Trust grows through feedback</p><h1>Leave a review.</h1><p className="adminIntro">Share a fair, constructive note about your completed skill exchange.</p>{error && <p className="formError" role="alert">{error}</p>}{success && <p className="matchNotice">{success}</p>}<form className="reviewForm" onSubmit={submit}><label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Very good</option><option value={3}>3 — Good</option><option value={2}>2 — Needs improvement</option><option value={1}>1 — Poor</option></select></label><label>Comment (optional)<textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={4} placeholder="What went well? What could help future exchanges?" /></label><button className="button" disabled={busy || !exchangeId}>{busy ? "Submitting…" : "Submit review"} ↗</button>{!exchangeId && <p className="pickerHint">Select “Leave a review” from a completed exchange to submit one.</p>}</form><section className="reviewHistory"><h2>Recent reviews</h2>{reviewsLoading && <p className="emptyAdmin" role="status">Loading reviews…</p>}{reviews.map((review) => <article className="reviewItem" key={review._id}><div className="reviewItemHeader"><strong>{review.reviewer?.fullName || "Community member"}</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><p>{review.comment || "No written comment."}</p><time>{new Date(review.createdAt).toLocaleDateString()}</time></article>)}{userId && !reviewsLoading && reviews.length === 0 && <p className="emptyAdmin">No reviews yet.</p>}</section></section></main>;
}
