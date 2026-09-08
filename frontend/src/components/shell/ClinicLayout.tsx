import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

interface ClinicLayoutProps {
  children: React.ReactNode;
}

export const ClinicLayout: React.FC<ClinicLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-bhon-bg">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden="true" className="bhon-ambient-bg pointer-events-none absolute inset-0 opacity-70" />
        <TopHeader />
        <main id="main-content" className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7 2xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
};
