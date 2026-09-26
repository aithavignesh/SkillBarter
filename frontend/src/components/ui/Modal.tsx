import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () => dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
    const firstElement = getFocusableElements()?.[0];
    (firstElement || dialogRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = getFocusableElements();
      if (!elements?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="modal-backdrop fixed inset-0 cursor-default bg-slate-900/60"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={`modal-panel relative z-10 my-auto flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] ${maxWidthStyles[maxWidth]}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p id={subtitleId} className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
