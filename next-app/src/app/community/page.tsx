"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Post = { _id: string; content: string; tags: string[]; likes: string[]; createdAt: string; author?: { _id?: string; id?: string; fullName: string; username: string; avatarUrl?: string } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");

  const load = useCallback(async () => {
    try {
      const [postData, userData] = await Promise.all([api<{ posts: Post[] }>("/api/posts"), api<{ user: { id: string } }>("/api/auth/me")]);
      setPosts(postData.posts); setUserId(userData.user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load community.";
      if (/Authentication required|invalid or expired|unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError("");
    try { await api("/api/posts", { method: "POST", body: JSON.stringify({ content }) }); setContent(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to publish post."); }
    finally { setBusy(false); }
  }

  async function toggleLike(post: Post) {
    try {
      await api(`/api/posts/${post._id}/like`, { method: "POST" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update like."); }
  }

  async function removePost(post: Post) {
    if (!window.confirm("Delete this post?")) return;
    try { await api(`/api/posts/${post._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to delete post."); }
  }

  return <main className="dashboardPage"><nav className="nav wrap"><Link className="brand" href="/">skill<span>barter</span></Link><div className="navActions"><Link className="navLink" href="/notifications">Notifications</Link><Link className="navLink" href="/dashboard">Dashboard</Link></div></nav><section className="communityContent wrap"><p className="eyebrow">Shared knowledge</p><h1>The community board.</h1><p className="adminIntro">Share a learning win, ask for advice, or give your community a useful tip.</p>{error && <p className="formError" role="alert">{error}</p>}<form className="postComposer" onSubmit={createPost}><label htmlFor="postContent">What would you like to share?</label><textarea id="postContent" value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={4} placeholder="A skill I am practicing, a question I have, something I learned…" /><div className="composerFooter"><span>{content.length}/5000</span><button className="button" disabled={busy || !content.trim()}>{busy ? "Publishing…" : "Publish post"} ↗</button></div></form><div className="communityFeed">{posts.map((post) => { const authorId = post.author?._id || post.author?.id || ""; const liked = post.likes?.some((id) => String(id) === String(userId)); return <article className="communityPost" key={post._id}><div className="postAuthor"><div className="postAvatar">{post.author?.fullName?.slice(0, 1).toUpperCase() || "S"}</div><div><strong>{post.author?.fullName || "SkillBarter member"}</strong><span>@{post.author?.username || "member"} · {new Date(post.createdAt).toLocaleString()}</span></div>{authorId === userId && <button className="postDelete" onClick={() => void removePost(post)} aria-label="Delete your post">Delete</button>}</div><p className="postContent">{post.content}</p>{post.tags?.length > 0 && <div className="postTags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}<div className="postActions"><button className={liked ? "liked" : ""} onClick={() => void toggleLike(post)} aria-pressed={!!liked}>{liked ? "♥ Liked" : "♡ Like"} · {post.likes?.length || 0}</button></div></article>; })}{posts.length === 0 && <div className="emptyAdmin">No community posts yet. Be the first to share something useful.</div>}</div></section></main>;
}
