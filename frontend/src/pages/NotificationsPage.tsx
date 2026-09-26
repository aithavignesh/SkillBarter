import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, MessageSquare, Repeat, ShieldCheck, UserPlus, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../context/NotificationContext';
import { trackEvent } from '../services/analytics';

const iconFor = (type: string) => {
  if (type === 'MESSAGE') return MessageSquare;
  if (type.startsWith('EXCHANGE')) return ArrowLeftRight;
  if (type.includes('CONNECT')) return UserPlus;
  if (type.includes('TRUST') || type.includes('REVIEW')) return ShieldCheck;
  return Repeat;
};

const groupFor = (type: string) => type === 'MESSAGE' ? 'Messages' : type.startsWith('EXCHANGE') ? 'Exchanges' : type.includes('CONNECT') ? 'Connections' : type.includes('TRUST') || type.includes('REVIEW') ? 'Trust & reviews' : 'Other';
const labelFor = (type: string) => {
  const labels: Record<string, string> = {
    MESSAGE: 'Message',
    EXCHANGE_ACCEPTED: 'Exchange accepted',
    EXCHANGE_REJECTED: 'Exchange declined',
    EXCHANGE_WITHDRAWN: 'Exchange withdrawn',
    EXCHANGE_CANCELLED: 'Exchange cancelled',
    EXCHANGE_COMPLETED: 'Exchange completed',
    EXCHANGE_COMPLETION_PENDING: 'Completion confirmed',
    EXCHANGE_SCHEDULE_UPDATED: 'Schedule updated',
    CONNECTION_REQUEST: 'Connection request',
    CONNECTION_ACCEPTED: 'Connection accepted',
    NEW_REVIEW: 'New review',
    TRUST_REVIEW: 'New review',
    REVIEW: 'New review',
  };
  return labels[type] || 'Activity';
};

const timeFor = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const filterOptions = ['ALL', 'Messages', 'Exchanges', 'Connections', 'Trust & reviews', 'Other'];
  const filtered = useMemo(
    () => filter === 'ALL' ? notifications : notifications.filter(item => groupFor(String(item.type || '')) === filter),
    [notifications, filter],
  );
  const unreadByGroup = useMemo(() => filterOptions.slice(1).reduce<Record<string, number>>((counts, key) => {
    counts[key] = notifications.filter(item => !item.is_read && groupFor(String(item.type || '')) === key).length;
    return counts;
  }, {}), [notifications]);

  const open = async (notification: typeof notifications[number]) => {
    await markAsRead(Number(notification.id));
    trackEvent('notification_opened', { notification_type: String(notification.type || 'OTHER'), has_link: Boolean(notification.link) });
    if (notification.link) navigate(notification.link);
  };

  return (
    <AppPageShell
      eyebrow="Activity"
      title="Notifications"
      description="Stay on top of messages, exchanges, connections and trust activity. Open an alert to jump straight to the action that needs your attention."
      icon={<Bell className="h-3.5 w-3.5" />}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void refreshNotifications()} loading={loading} icon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
          {unreadCount > 0 && <Button size="sm" onClick={() => void markAllAsRead()} icon={<CheckCheck className="h-4 w-4" />}>Mark all read</Button>}
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#697386]" aria-live="polite">
          {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}
        </p>
        <div className="flex max-w-full gap-1 overflow-x-auto border border-[#e1e4e8] bg-white p-1" role="group" aria-label="Filter notifications">
          {filterOptions.map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
              className={`min-h-9 shrink-0 px-2.5 py-1.5 text-[10px] font-bold transition-colors ${filter === option ? 'bg-[#17233b] text-white' : 'text-slate-600 hover:bg-[#f7f8f7]'}`}
            >
              {option === 'ALL' ? 'All' : option}
              {option !== 'ALL' && unreadByGroup[option] > 0 && <span className="ml-1.5 inline-flex min-w-4 justify-center bg-[#d31d24] px-1 text-[8px] text-white">{unreadByGroup[option]}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex flex-col gap-3 border border-[#f1c8ca] bg-[#fff7f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-xs text-[#8f1a20]">Notifications couldn’t be updated. {error}</p>
          <Button size="sm" variant="outline" onClick={() => void refreshNotifications()} loading={loading}>Try again</Button>
        </div>
      )}

      <Card className="notifications-surface overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500" role="status">Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="notifications-empty p-10 text-center sm:p-14">
            <Bell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-[#17233b]">{notifications.length ? 'No notifications in this category' : 'No activity yet'}</p>
            <p className="mt-1 text-xs text-[#697386]">{notifications.length ? 'Try another filter to see your recent activity.' : 'Messages and exchange updates will appear here.'}</p>
          </div>
        ) : (
          <div className="notifications-list">
            {filtered.map(notification => {
              const Icon = iconFor(String(notification.type || ''));
              const unread = !notification.is_read;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void open(notification)}
                  aria-label={`${unread ? 'Unread notification: ' : ''}${notification.title || labelFor(String(notification.type || ''))}`}
                  className={`notification-item flex w-full items-start gap-3 border-b border-[#edf0f2] p-4 text-left last:border-0 sm:gap-4 sm:p-5 ${unread ? 'notification-item--unread bg-[#fff8f8]' : 'notification-item--read'}`}
                >
                  <span className={`notification-item__icon flex h-10 w-10 shrink-0 items-center justify-center ${unread ? 'bg-[#fff0f0] text-[#d31d24]' : 'bg-[#f3f5f7] text-[#697386]'}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`notification-item__title min-w-0 text-sm text-[#17233b] ${unread ? 'font-bold' : 'font-semibold'}`}>{notification.title || labelFor(String(notification.type || ''))}</span>
                      <span className={`notification-item__indicator mt-1.5 h-1.5 w-1.5 shrink-0 ${unread ? 'bg-[#d31d24]' : ''}`} aria-hidden="true" />
                    </span>
                    <span className="notification-item__message mt-1 block break-words text-xs leading-5 text-[#697386]">{notification.message}</span>
                    <span className="notification-item__meta mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span>{timeFor(notification.created_at)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{labelFor(String(notification.type || ''))}</span>
                      {notification.link && <span className="font-bold text-[#d31d24]">Open →</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </AppPageShell>
  );
};
