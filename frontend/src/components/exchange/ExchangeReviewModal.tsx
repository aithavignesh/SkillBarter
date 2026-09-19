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
      onClose={onClose}
      title="Review your learning session"
      subtitle={`Share feedback about your session with ${partner.full_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 border border-[#e1e4e8] bg-[#f7f8f7] p-3">
          <img
            src={partner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={partner.full_name}
            className="h-10 w-10 rounded-full border border-[#dfe3e8] object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900">{partner.full_name}</h4>
            <p className="text-[11px] text-slate-500">{partner.headline || 'Student & Peer Learner'}</p>
          </div>
          <span className="border border-red-100 bg-[#fff5f5] px-2.5 py-1 text-[10px] font-bold text-[#d31d24]">
            ★ {Math.round(partner.trust_score)}
          </span>
        </div>

        <div className="border border-[#e1e4e8] bg-white p-4 text-center">
          <label className="block text-xs font-bold text-slate-800 mb-2">
            How was the learning session?
          </label>
          <div className="flex justify-center mb-1">
            <RatingStars value={rating} onChange={setRating} size="lg" />
          </div>
          <p className="text-[11px] text-slate-500">Rate the session from 1 to 5 stars</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border border-[#e1e4e8] bg-white p-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Was your learning partner reliable?
            </label>
            <RatingStars value={reliabilityScore} onChange={setReliabilityScore} size="sm" showScore />
          </div>

          <div className="border border-[#e1e4e8] bg-white p-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Was the learning useful and as expected?
            </label>
            <RatingStars value={skillQualityScore} onChange={setSkillQualityScore} size="sm" showScore />
          </div>
        </div>

        <div className="flex items-center justify-between border border-[#e1e4e8] bg-white p-3">
          <span className="text-xs font-semibold text-slate-700">
            Would you learn with this partner again?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWouldExchangeAgain(true)}
              className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-all ${
                wouldExchangeAgain
                  ? 'bg-[#d31d24] text-white'
                  : 'bg-[#f7f8f7] text-slate-600 hover:bg-[#eef0f2]'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldExchangeAgain(false)}
              className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-all ${
                !wouldExchangeAgain
                  ? 'bg-[#17233b] text-white'
                  : 'bg-[#f7f8f7] text-slate-600 hover:bg-[#eef0f2]'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> No
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Peer learning feedback
          </label>
          <textarea
            rows={3}
            placeholder="What helped you learn? Share a quick note for future learners."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-[#dfe3e8] p-3 text-xs text-[#17233b] outline-none placeholder:text-slate-400 focus:border-[#d31d24]"
          />
        </div>

        {error && (
          <p className="border border-red-100 bg-[#fff5f5] p-2.5 text-xs text-[#b8171d]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-[#e1e4e8] pt-4">
          <p className="text-[11px] text-slate-500">
            Your review helps build trust for future learning matches.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Skip for now
            </Button>
            <Button type="submit" loading={loading} icon={<CheckCircle className="w-4 h-4" />}>
              Submit Review
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
