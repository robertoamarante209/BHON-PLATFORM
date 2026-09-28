import React, { useState } from 'react';
import { CircleHelp } from 'lucide-react';

export function ContextualHelp({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-bhon-muted hover:bg-bhon-ivory hover:text-bhon-navy"><CircleHelp className="h-4 w-4" aria-hidden="true" />{title}</button>
    {open ? <div role="status" className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-bhon-border bg-white p-3 text-xs leading-5 text-bhon-muted shadow-lg">{description}</div> : null}
  </div>;
}
