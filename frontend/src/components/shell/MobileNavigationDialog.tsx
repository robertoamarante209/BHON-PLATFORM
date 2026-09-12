import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function MobileNavigationDialog({ clinicName, onClose, children }: {
  clinicName: string; onClose: () => void; children: ReactNode;
}) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlayRef.current,
    );
    const previousInert = background.map((element) => element.hasAttribute('inert'));
    background.forEach((element) => element.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const targets = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex="0"]',
      ) || []);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (!dialogRef.current?.contains(event.target as Node)) closeRef.current?.focus();
    };
    const closeOnDesktop = () => { if (window.innerWidth >= 640) onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', containFocus);
    window.addEventListener('resize', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', containFocus);
      window.removeEventListener('resize', closeOnDesktop);
      background.forEach((element, index) => { if (!previousInert[index]) element.removeAttribute('inert'); });
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  return createPortal(
    <div ref={overlayRef} className="bhon-clinic-theme fixed inset-0 z-[70] bg-bhon-navy/40" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-bhon-border bg-bhon-surface p-4 text-bhon-text shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-bhon-muted">{clinicName}</p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold">Navegação clínica</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar navegação" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-bhon-muted hover:bg-bhon-bg">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>, document.body,
  );
}
