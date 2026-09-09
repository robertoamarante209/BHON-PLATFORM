import React, { useEffect } from 'react';

interface BrandIntroProps {
  onComplete: () => void;
  durationMs?: number;
}

export const BrandIntro: React.FC<BrandIntroProps> = ({ onComplete, durationMs = 2200 }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <main className="bhon-intro fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#fffefb] px-6" aria-label="Apresentação da BHON">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-bhon-teal/[0.07] blur-3xl sm:h-[38rem] sm:w-[38rem]" />
      <div aria-hidden="true" className="bhon-intro-orbit absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bhon-teal/15 sm:h-80 sm:w-80" />

      <section role="status" aria-live="polite" className="relative flex w-full max-w-3xl flex-col items-center text-center">
        <div className="bhon-intro-logo w-full overflow-hidden">
          <img src="/logo-official.jpg" alt="BHON — A clínica no controle." width="1920" height="1280" className="mx-auto block h-auto w-full" />
        </div>
        <div className="bhon-intro-line -mt-[18%] h-px w-24 bg-gradient-to-r from-transparent via-bhon-teal to-transparent sm:w-36" aria-hidden="true" />
        <p className="bhon-intro-copy mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-bhon-muted sm:text-xs">Clareza para cuidar. Controle para crescer.</p>
      </section>

      <button type="button" onClick={onComplete} className="absolute right-4 top-4 min-h-11 rounded-full px-4 text-xs font-semibold text-bhon-muted transition-colors hover:bg-bhon-ivory hover:text-bhon-navy sm:right-6 sm:top-6" aria-label="Pular introdução">
        Pular
      </button>
    </main>
  );
};
