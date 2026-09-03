import React from 'react';
import { PlatformSidebar } from './PlatformSidebar';
import { ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({ children }) => {
  const { currentUser } = useAuth();

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header do Mantenedor da Plataforma */}
        <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 tracking-wide">
              BHON PLATFORM MANAGEMENT CENTER
            </span>
            <span className="font-mono-data text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800 px-1.5 py-0.2 rounded">
              MODO OPERADOR GLOBAL
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-mono-data text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Cluster de Produção Online</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-200">{currentUser.name}</span>
              <span className="text-[10px] font-mono-data text-amber-400 block">PLATFORM_OWNER</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};
