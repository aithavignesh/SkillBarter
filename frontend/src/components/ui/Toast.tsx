import React, { useEffect } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

type ToastProps = {
  kind: ToastKind;
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export const Toast: React.FC<ToastProps> = ({ kind, title, message, onClose, duration = 5000 }) => {
  const Icon = icons[kind];

  useEffect(() => {
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onClose]);

  return (
    <div className={`app-toast app-toast--${kind}`} role={kind === 'error' ? 'alert' : 'status'} aria-live={kind === 'error' ? 'assertive' : 'polite'}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5">{message}</p>
      </div>
      <button type="button" className="app-toast__close" onClick={onClose} aria-label="Dismiss notification">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
