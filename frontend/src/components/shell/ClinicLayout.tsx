import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

interface ClinicLayoutProps {
  children: React.ReactNode;
}

export const ClinicLayout: React.FC<ClinicLayoutProps> = ({ children }) => {
  return (
    <div className="bhon-dark-theme flex h-[100dvh] overflow-hidden bg-bhon-bg text-bhon-text">
      <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-bhon-navy px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0">
        Ir para o conteúdo principal
      </a>
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden="true" className="bhon-ambient-bg pointer-events-none absolute inset-0 opacity-70" />
        <TopHeader />
        <main id="main-content" tabIndex={-1} className="relative flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 sm:pb-6 lg:px-8 lg:py-7 2xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
};
