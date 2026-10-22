"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Person = { _id?: string; id?: string; fullName: string; username: string; avatarUrl?: string };
type Comment = { _id: string; content: string; createdAt: string; author?: Person };
type Post = { _id: string; content: string; tags: string[]; likes: string[]; createdAt: string; author?: Person };

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

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postData, userData] = await Promise.all([
        api<{ posts: Post[] }>("/api/posts"),
        api<{ user: { id: string } }>("/api/auth/me")
      ]);
      setPosts(postData.posts);
      setUserId(userData.user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load community.";
      if (/Authentication required|invalid or expired|unavailable/i.test(message)) router.replace("/login");
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  function handleActionError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    if (/Authentication required|invalid or expired|session has been revoked|account is unavailable/i.test(message)) router.replace("/login");
    else setError(message);
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/posts", { method: "POST", body: JSON.stringify({ content }) });
      setContent("");
      await load();
    } catch (e) {
      handleActionError(e, "Unable to publish post.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(post: Post) {
    setError("");
    try {
      await api(`/api/posts/${post._id}/like`, { method: "POST" });
      await load();
    } catch (e) {
      handleActionError(e, "Unable to update like.");
    }
  }

  async function toggleComments(post: Post) {
    const isOpen = !!expandedComments[post._id];
    setExpandedComments((current) => ({ ...current, [post._id]: !isOpen }));
    if (isOpen || commentsByPost[post._id]) return;
    setCommentBusy(post._id);
    setError("");
    try {
      const data = await api<{ comments: Comment[] }>(`/api/posts/${post._id}/comments`);
      setCommentsByPost((current) => ({ ...current, [post._id]: data.comments }));
    } catch (e) {
      handleActionError(e, "Unable to load comments.");
      setExpandedComments((current) => ({ ...current, [post._id]: false }));
    } finally {
      setCommentBusy("");
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>, post: Post) {
    event.preventDefault();
    const draft = commentDrafts[post._id] || "";
    if (!draft.trim()) return;
    setCommentBusy(post._id);
    setError("");
    try {
      const data = await api<{ comment: Comment }>(`/api/posts/${post._id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: draft })
      });
      setCommentsByPost((current) => ({
        ...current,
        [post._id]: [...(current[post._id] || []), data.comment]
      }));
      setCommentDrafts((current) => ({ ...current, [post._id]: "" }));
      setExpandedComments((current) => ({ ...current, [post._id]: true }));
    } catch (e) {
      handleActionError(e, "Unable to publish comment.");
    } finally {
      setCommentBusy("");
    }
  }

  async function removeComment(post: Post, comment: Comment) {
    if (!window.confirm("Delete this comment?")) return;
    setError("");
    try {
      await api(`/api/posts/comments/${comment._id}`, { method: "DELETE" });
      setCommentsByPost((current) => ({
        ...current,
        [post._id]: (current[post._id] || []).filter((item) => item._id !== comment._id)
      }));
    } catch (e) {
      handleActionError(e, "Unable to delete comment.");
    }
  }

  async function removePost(post: Post) {
    if (!window.confirm("Delete this post?")) return;
    try {
      await api(`/api/posts/${post._id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      handleActionError(e, "Unable to delete post.");
    }
  }

  return (
    <main className="dashboardPage">
      <nav className="nav wrap">
        <Link className="brand" href="/">skill<span>barter</span></Link>
        <div className="navActions">
          <Link className="navLink" href="/notifications">Notifications</Link>
          <Link className="navLink" href="/dashboard">Dashboard</Link>
        </div>
      </nav>
      <section className="communityContent wrap">
        <p className="eyebrow">Shared knowledge</p>
        <h1>The community board.</h1>
        <p className="adminIntro">Share a learning win, ask for advice, or give your community a useful tip.</p>
        {error && <p className="formError" role="alert">{error}</p>}
        <form className="postComposer" onSubmit={createPost}>
          <label htmlFor="postContent">What would you like to share?</label>
          <textarea id="postContent" value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={4} placeholder="A skill I am practicing, a question I have, something I learned…" />
          <div className="composerFooter"><span>{content.length}/5000</span><button className="button" disabled={busy || !content.trim()}>{busy ? "Publishing…" : "Publish post"} ↗</button></div>
        </form>
        {loading ? <p className="emptyAdmin" role="status">Loading community posts…</p> : <div className="communityFeed">
          {posts.map((post) => {
            const authorId = post.author?._id || post.author?.id || "";
            const liked = post.likes?.some((id) => String(id) === String(userId));
            const comments = commentsByPost[post._id] || [];
            const isCommentBusy = commentBusy === post._id;
            return (
              <article className="communityPost" key={post._id}>
                <div className="postAuthor">
                  <div className="postAvatar">{post.author?.fullName?.slice(0, 1).toUpperCase() || "S"}</div>
                  <div><strong>{post.author?.fullName || "SkillBarter member"}</strong><span>@{post.author?.username || "member"} · {new Date(post.createdAt).toLocaleString()}</span></div>
                  {authorId === userId && <button className="postDelete" onClick={() => void removePost(post)} aria-label="Delete your post">Delete</button>}
                </div>
                <p className="postContent">{post.content}</p>
                {post.tags?.length > 0 && <div className="postTags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                <div className="postActions">
                  <button className={liked ? "liked" : ""} onClick={() => void toggleLike(post)} aria-pressed={!!liked}>{liked ? "♥ Liked" : "♡ Like"} · {post.likes?.length || 0}</button>
                  <button onClick={() => void toggleComments(post)} aria-expanded={!!expandedComments[post._id]}>
                    {expandedComments[post._id] ? "Hide comments" : "Comments"}{commentsByPost[post._id] ? ` · ${comments.length}` : ""}
                  </button>
                </div>
                {expandedComments[post._id] && (
                  <section className="postComments" aria-label="Post comments">
                    {isCommentBusy && !commentsByPost[post._id] && <p className="commentHint">Loading comments…</p>}
                    {comments.map((comment) => {
                      const commentAuthorId = comment.author?._id || comment.author?.id || "";
                      return (
                        <article className="postComment" key={comment._id}>
                          <div className="postCommentMeta"><strong>{comment.author?.fullName || "SkillBarter member"}</strong><span>{new Date(comment.createdAt).toLocaleString()}</span>
                            {commentAuthorId === userId && <button className="postDelete" onClick={() => void removeComment(post, comment)}>Delete</button>}
                          </div>
                          <p>{comment.content}</p>
                        </article>
                      );
                    })}
                    {!isCommentBusy && commentsByPost[post._id]?.length === 0 && <p className="commentHint">No comments yet. Start a helpful conversation.</p>}
                    <form className="commentComposer" onSubmit={(event) => void addComment(event, post)}>
                      <label className="srOnly" htmlFor={`comment-${post._id}`}>Add a comment</label>
                      <input id={`comment-${post._id}`} value={commentDrafts[post._id] || ""} maxLength={2000} onChange={(e) => setCommentDrafts((current) => ({ ...current, [post._id]: e.target.value }))} placeholder="Write a helpful comment…" />
                      <button className="button" disabled={isCommentBusy || !(commentDrafts[post._id] || "").trim()}>{isCommentBusy ? "Please wait…" : "Comment"}</button>
                    </form>
                  </section>
                )}
              </article>
            );
          })}
          {posts.length === 0 && <div className="emptyAdmin">No community posts yet. Be the first to share something useful.</div>}
        </div>}
      </section>
    </main>
  );
}
