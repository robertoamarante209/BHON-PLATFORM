import React from 'react';

interface EmptyStateProps {
  title: string;
  reason: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  reason,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="py-12 px-6 text-center border border-dashed border-bhon-border rounded bg-slate-50/50">
      {icon && <div className="mx-auto w-10 h-10 text-bhon-muted mb-3 flex items-center justify-center">{icon}</div>}
      <h4 className="text-sm font-bold text-bhon-text uppercase tracking-wide">{title}</h4>
      <p className="text-xs text-bhon-muted max-w-sm mx-auto mt-1 leading-relaxed">
        {reason}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 bg-bhon-navy hover:bg-bhon-navy-hover text-white text-xs font-semibold rounded transition-colors inline-flex items-center gap-1.5"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
