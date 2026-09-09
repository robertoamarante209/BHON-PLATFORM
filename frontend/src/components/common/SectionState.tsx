import React from 'react';
import type { LucideIcon } from 'lucide-react';

type SectionStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export const SectionState: React.FC<SectionStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bhon-border bg-bhon-ivory text-bhon-teal-dark" aria-hidden="true">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="mt-4 text-pretty font-display text-xl text-bhon-navy">{title}</h3>
    <p className="mt-2 max-w-md text-pretty text-sm leading-6 text-bhon-muted">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
