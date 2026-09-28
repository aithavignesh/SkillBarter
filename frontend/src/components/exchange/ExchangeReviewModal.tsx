import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RatingStars } from '../ui/RatingStars';
import { Exchange } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ExchangeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: Exchange | null;
  onSuccess?: () => void;
}

export const ExchangeReviewModal: React.FC<ExchangeReviewModalProps> = ({
  isOpen,
  onClose,
  exchange,
  onSuccess,
}) => {
  const { currentUser, refreshUser } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [reliabilityScore, setReliabilityScore] = useState<number>(5);
  const [skillQualityScore, setSkillQualityScore] = useState<number>(5);
  const [wouldExchangeAgain, setWouldExchangeAgain] = useState<boolean>(true);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!exchange || !currentUser) return null;

  const partner = currentUser.id === exchange.requester_id ? exchange.receiver : exchange.requester;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.submitReview({
        exchange_id: exchange.id,
        rating,
        reliability_score: reliabilityScore,
        skill_quality_score: skillQualityScore,
        would_exchange_again: wouldExchangeAgain,
        comment: comment.trim() || undefined,
      });

      await refreshUser();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!loading) onClose(); }}
      title="Review your learning session"
      subtitle={`Share feedback about your session with ${partner.full_name}`}
      maxWidth="md"
      closeDisabled={loading}
    >
      <form onSubmit={handleSubmit} className="review-form space-y-5" aria-busy={loading}>
        <div className="flex min-w-0 items-center gap-3 border border-[#e1e4e8] bg-[#f7f8f7] p-3">
          <img
            src={partner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={partner.full_name}
            className="h-10 w-10 rounded-full border border-[#dfe3e8] object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="break-words text-xs font-bold text-slate-900">{partner.full_name}</h4>
            <p className="break-words text-[11px] text-slate-500">{partner.headline || 'Student & Peer Learner'}</p>
          </div>
          <span className="border border-red-100 bg-[#fff5f5] px-2.5 py-1 text-[10px] font-bold text-[#d31d24]">
            ★ {Math.round(partner.trust_score || 0)}
          </span>
        </div>

        <fieldset className="border border-[#e1e4e8] bg-white p-4 text-center">
          <legend className="sr-only">Overall session rating</legend>
          <label className="mb-2 block text-sm font-bold text-slate-800">
            How was the learning session?
          </label>
          <div className="mb-1 flex justify-center">
            <RatingStars value={rating} onChange={setRating} size="lg" ariaLabel="Overall session rating" disabled={loading} />
          </div>
          <p className="text-xs font-semibold text-[#17233b]">{rating} out of 5 stars</p>
          <p className="mt-1 text-[11px] text-slate-500">Rate the session from 1 to 5 stars</p>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <fieldset className="min-w-0 border border-[#e1e4e8] bg-white p-3">
            <legend className="text-xs font-semibold leading-5 text-slate-700">
              Was your learning partner reliable?
            </legend>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <RatingStars value={reliabilityScore} onChange={setReliabilityScore} size="sm" ariaLabel="Learning partner reliability rating" disabled={loading} />
              <span className="text-[10px] text-slate-500">{reliabilityScore}/5</span>
            </div>
          </fieldset>

          <fieldset className="min-w-0 border border-[#e1e4e8] bg-white p-3">
            <legend className="text-xs font-semibold leading-5 text-slate-700">
              Was the learning useful and as expected?
            </legend>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <RatingStars value={skillQualityScore} onChange={setSkillQualityScore} size="sm" ariaLabel="Learning quality rating" disabled={loading} />
              <span className="text-[10px] text-slate-500">{skillQualityScore}/5</span>
            </div>
          </fieldset>
        </div>

        <fieldset className="flex flex-wrap items-center justify-between gap-3 border border-[#e1e4e8] bg-white p-3">
          <legend className="sr-only">Would you learn with this partner again?</legend>
          <span aria-hidden="true" className="text-xs font-semibold text-slate-700">
            Would you learn with this partner again?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setWouldExchangeAgain(true)}
              aria-pressed={wouldExchangeAgain}
              className={`min-h-10 px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24] ${
                wouldExchangeAgain
                  ? 'bg-[#d31d24] text-white'
                  : 'bg-[#f7f8f7] text-slate-600 hover:bg-[#eef0f2]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Yes
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setWouldExchangeAgain(false)}
              aria-pressed={!wouldExchangeAgain}
              className={`min-h-10 px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24] ${
                !wouldExchangeAgain
                  ? 'bg-[#17233b] text-white'
                  : 'bg-[#f7f8f7] text-slate-600 hover:bg-[#eef0f2]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> No
            </button>
          </div>
        </fieldset>

        <div>
          <label htmlFor="exchange-review-comment" className="mb-1 block text-xs font-semibold text-slate-700">
            Peer learning feedback
          </label>
          <textarea
            id="exchange-review-comment"
            rows={3}
            placeholder="What helped you learn? Share a quick note for future learners."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="review-text-input min-h-28 w-full min-w-0 resize-y border border-[#dfe3e8] bg-white p-3 text-sm leading-6 text-[#17233b] outline-none placeholder:text-slate-400 focus:border-[#d31d24] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          />
        </div>

        {error && (
        <p role="alert" className="break-words border border-red-100 bg-[#fff5f5] p-2.5 text-xs text-[#b8171d]">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-[#e1e4e8] pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="break-words text-[11px] leading-5 text-slate-600">
            Your review helps build trust for future learning matches.
          </p>
        <div className="grid gap-2 sm:flex sm:shrink-0 sm:items-center">
          <Button type="button" size="sm" className="w-full sm:w-auto" variant="outline" onClick={onClose} disabled={loading}>
              Skip for now
            </Button>
          <Button type="submit" size="sm" className="w-full sm:w-auto" loading={loading} icon={<CheckCircle className="w-4 h-4" />}>
              Submit Review
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
