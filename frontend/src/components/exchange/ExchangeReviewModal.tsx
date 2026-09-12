import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RatingStars } from '../ui/RatingStars';
import { Exchange } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Star, CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

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
      title="Review Skill Barter 🎉"
      subtitle={`Rate your experience with ${partner.full_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <img
            src={partner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={partner.full_name}
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900">{partner.full_name}</h4>
            <p className="text-[11px] text-slate-500">{partner.headline || 'Community Partner'}</p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            ★ {Math.round(partner.trust_score)}
          </span>
        </div>

        {/* Overall Rating */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 text-center">
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Overall Experience Rating
          </label>
          <div className="flex justify-center mb-1">
            <RatingStars value={rating} onChange={setRating} size="lg" />
          </div>
          <p className="text-[11px] text-slate-500">Click to select 1 to 5 stars</p>
        </div>

        {/* Breakdown Questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Was the person reliable?
            </label>
            <RatingStars value={reliabilityScore} onChange={setReliabilityScore} size="sm" showScore />
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Was the skill delivered as promised?
            </label>
            <RatingStars value={skillQualityScore} onChange={setSkillQualityScore} size="sm" showScore />
          </div>
        </div>

        {/* Would exchange again toggle */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Would you exchange skills with this neighbor again?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWouldExchangeAgain(true)}
              className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-all ${
                wouldExchangeAgain
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldExchangeAgain(false)}
              className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-all ${
                !wouldExchangeAgain
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> No
            </button>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Community Review & Feedback
          </label>
          <textarea
            rows={3}
            placeholder="Share details to help other neighbors in the community know what to expect..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Skip for now
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle className="w-4 h-4" />}>
            Submit Review & Update Trust
          </Button>
        </div>
      </form>
    </Modal>
  );
};
