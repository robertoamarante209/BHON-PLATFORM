import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-md',
}) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar painel"
        className="fixed inset-0 h-full w-full bg-slate-900/40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`bhon-drawer-enter w-screen ${width} bg-white shadow-xl flex flex-col border-l border-bhon-border`}>
          {/* Header */}
          <div className="p-4 border-b border-bhon-border flex items-center justify-between bg-slate-50/70">
            <div>
              <h3 id={titleId} className="text-sm font-bold text-bhon-text uppercase tracking-wide">{title}</h3>
              {subtitle && <p className="text-xs text-bhon-muted mt-0.5">{subtitle}</p>}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Fechar painel"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-bhon-muted transition-colors hover:bg-slate-200 hover:text-bhon-text"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
