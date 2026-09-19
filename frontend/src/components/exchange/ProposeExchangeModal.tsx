import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UserSummary } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Repeat, ShieldAlert, Calendar, Clock, MapPin } from 'lucide-react';

interface ProposeExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: UserSummary | null;
  defaultPartnerSkill?: string;
  defaultMySkill?: string;
  onSuccess?: () => void;
}

export const ProposeExchangeModal: React.FC<ProposeExchangeModalProps> = ({
  isOpen,
  onClose,
  partner,
  defaultPartnerSkill = '',
  defaultMySkill = '',
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [mySkill, setMySkill] = useState(defaultMySkill);
  const [partnerSkill, setPartnerSkill] = useState(defaultPartnerSkill);
  const [message, setMessage] = useState('');
  const [messageTouched, setMessageTouched] = useState(false);
  const [preferredDate, setPreferredDate] = useState('This weekend');
  const [estimatedHours, setEstimatedHours] = useState('2.0');
  const [locationArea, setLocationArea] = useState('Online or a shared campus space');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setMySkill(defaultMySkill || '');
    setPartnerSkill(defaultPartnerSkill || '');
    setMessage('');
    setMessageTouched(false);
  }, [defaultMySkill, defaultPartnerSkill, isOpen]);

  if (!partner) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Tell them what you want to learn and what you can teach');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.proposeExchange({
        receiver_id: partner.id,
        requester_skill_name: mySkill || 'General Assistance',
        receiver_skill_name: partnerSkill || 'Skill Exchange',
        proposal_message: message.trim(),
        preferred_date: preferredDate,
        estimated_hours: parseFloat(estimatedHours) || 2.0,
        location_area: locationArea,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send exchange request');
    } finally {
      setLoading(false);
    }
  };

  const offeredOptions = currentUser?.skills?.filter(s => s.skill_type === 'OFFERED').map(s => s.skill_name) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start your first learning exchange"
      subtitle={`Send ${partner.full_name} a clear, low-friction learning plan`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Partner preview card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <img
            src={partner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={partner.full_name}
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 truncate">{partner.full_name}</h4>
            <p className="text-[11px] text-slate-500 truncate">{partner.headline || 'Student & Peer Learner'}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              ★ {Math.round(partner.trust_score)} Trust
            </span>
            {partner.distance_display && (
              <p className="text-[10px] text-slate-400 mt-0.5">{partner.distance_display}</p>
            )}
          </div>
        </div>

        {/* Skill exchange match banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
              You Can Teach:
            </label>
            {offeredOptions.length > 0 ? (
              <select
                value={mySkill}
                onChange={(e) => setMySkill(e.target.value)}
                className="w-full text-xs bg-white border border-emerald-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {offeredOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="Custom Skill">Other custom skill...</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. React or Python"
                value={mySkill}
                onChange={(e) => setMySkill(e.target.value)}
                className="w-full text-xs bg-white border border-emerald-300 rounded-lg p-2 font-medium text-slate-800"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
              You Want to Learn:
            </label>
            <input
              type="text"
              placeholder="e.g. AI / Machine Learning"
              value={partnerSkill}
              onChange={(e) => setPartnerSkill(e.target.value)}
              className="w-full text-xs bg-white border border-emerald-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        {/* Proposal Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            What would you like to learn together? <span className="text-rose-500">*</span><span className="ml-2 font-normal text-slate-400">One short message is enough.</span>
          </label>
          <textarea
            rows={3}
            placeholder={`Hi ${partner.full_name.split(' ')[0]}, I’d like to learn ${partnerSkill || 'this skill'} and I can teach ${mySkill || 'a skill I know'}. Would you be open to a short session?`}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setMessageTouched(true); }}
            className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
            required
          />
        </div>

        {!messageTouched && (
          <button type="button" onClick={() => { setMessage(`Hi ${partner.full_name.split(' ')[0]}, I’d like to learn ${partnerSkill || 'this skill'} and I can teach ${mySkill || 'a skill I know'}. Would you be open to a short session?`); setMessageTouched(true); }} className="-mt-2 text-left text-[11px] font-semibold text-emerald-700 hover:underline">Use a suggested message</button>
        )}

        {/* Logistics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 mb-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Preferred Session
            </label>
            <input
              type="text"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Session Length (Hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 mb-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Session Location
            </label>
            <input
              type="text"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2"
            />
          </div>
        </div>

        {/* Learning-first guidance */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Keep the first request simple:</strong> agree on one small learning outcome and a comfortable session format. You can refine the plan after they accept.
          </p>
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} icon={<Repeat className="w-4 h-4" />}>
            Send Learning Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
