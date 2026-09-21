import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Button } from '../components/ui/Button';
import { trackEvent } from '../services/analytics';
import { ArrowRight, Check, Copy, Mail, Share2, Users } from 'lucide-react';

export const InvitePeersPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const inviteUrl = useMemo(() => {
    const url = new URL(window.location.origin);
    url.pathname = '/signup';
    url.searchParams.set('ref', 'peer-invite');
    return url.toString();
  }, []);

  const inviteMessage = `I'm using SkillBarter to learn practical skills from peers while sharing what I know. Join me and create your learning profile: ${inviteUrl}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      trackEvent('referral_shared', { method: 'copy' });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const shareInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join me on SkillBarter',
          text: 'Learn a skill from a peer and teach what you know.',
          url: inviteUrl,
        });
        trackEvent('referral_shared', { method: 'native_share' });
      } else {
        await copyInvite();
      }
    } catch {
      // Ignore share cancellation.
    }
  };

  const emailInvite = () => {
    const subject = encodeURIComponent('Join me on SkillBarter');
    const body = encodeURIComponent(inviteMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackEvent('referral_shared', { method: 'email' });
  };

  return (
    <AppPageShell
      eyebrow="Grow the learning network"
      title="Invite a few people who can make your next exchange possible"
      description="SkillBarter works better when people you know join with clear skills they can teach and skills they want to learn."
      icon={<Users className="h-3.5 w-3.5" />}
      actions={<Link to="/matches"><Button size="sm" variant="outline">Back to my matches</Button></Link>}
    >
      <div className="grid gap-px border border-[#e1e4e8] bg-[#e1e4e8] lg:grid-cols-[1.1fr_.9fr]">
        <section className="bg-white p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d31d24]">Simple invite loop</p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.035em] text-[#17233b]">Bring in classmates, teammates or friends with skills you want to learn.</h2>
          <div className="mt-7 space-y-4">
            {[
              ['1', 'Share your invite', 'Send the link through WhatsApp, email or your preferred channel.'],
              ['2', 'They build a learning profile', 'They add what they can teach and what they want to learn.'],
              ['3', 'Come back for a better match', 'A growing local network creates more opportunities for real exchanges.'],
            ].map(([number, title, text]) => (
              <div key={number} className="flex gap-4 border-t border-[#edf0f2] pt-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#fff5f5] text-[11px] font-bold text-[#d31d24]">{number}</span>
                <div><p className="text-[12px] font-bold text-[#17233b]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#727b89]">{text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f9f8] p-6 sm:p-8">
          <div className="border border-[#dfe3e7] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#17233b]"><Share2 className="h-4 w-4 text-[#d31d24]" /> Your invite</div>
            <p className="mt-4 break-all border border-[#edf0f2] bg-[#fafbfc] p-3 text-[10px] leading-5 text-[#697386]">{inviteUrl}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button size="sm" onClick={shareInvite} icon={<Share2 className="h-3.5 w-3.5" />}>Share invite</Button>
              <Button size="sm" variant="outline" onClick={copyInvite} icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>{copied ? 'Copied' : 'Copy message'}</Button>
            </div>
            <button type="button" onClick={emailInvite} className="mt-2 flex w-full items-center justify-center gap-2 border border-[#e1e4e8] bg-white px-3 py-2.5 text-[11px] font-bold text-[#4d5b72] hover:border-[#cbd1d8] hover:text-[#17233b]"><Mail className="h-3.5 w-3.5" /> Invite by email</button>
          </div>
          <div className="mt-4 border border-[#e8d4d4] bg-[#fffafa] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#d31d24]">Best people to invite</p>
            <p className="mt-2 text-[11px] leading-5 text-[#697386]">Think of 3–5 people who know a skill you want to learn, or who would benefit from something you can teach.</p>
          </div>
        </section>
      </div>

      <div className="mt-4 flex flex-col gap-3 border border-[#e1e4e8] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold text-[#17233b]">Ready to keep building your network?</p><p className="mt-1 text-[10px] text-[#737b87]">You can return to your matches anytime and send a learning request.</p></div>
        <Link to="/discover"><Button size="sm" variant="outline" icon={<ArrowRight className="h-3.5 w-3.5" />}>Find people to learn from</Button></Link>
      </div>
    </AppPageShell>
  );
};
