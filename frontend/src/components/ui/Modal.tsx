import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  closeDisabled?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  closeDisabled = false,
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
        if (!closeDisabled) onCloseRef.current();
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
  }, [isOpen, closeDisabled]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={closeDisabled}
        className="modal-backdrop fixed inset-0 cursor-default bg-slate-900/60 disabled:cursor-wait"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={`modal-panel relative z-10 my-auto flex max-h-[calc(100dvh-1rem)] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(23,35,59,0.14)] sm:max-h-[calc(100dvh-2rem)] ${maxWidthStyles[maxWidth]}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 id={titleId} className="break-words text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p id={subtitleId} className="mt-1 break-words text-xs leading-5 text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={closeDisabled}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d31d24] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 min-w-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
