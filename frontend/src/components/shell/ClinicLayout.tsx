import React from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

interface ClinicLayoutProps {
  children: React.ReactNode;
}

export const ClinicLayout: React.FC<ClinicLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-bhon-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
