import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Calendar, FileText, DollarSign, ArrowRight } from 'lucide-react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { useLocation } from 'wouter';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { globalSearch } = useOperationalData();
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = globalSearch(query);

  const handleSelect = (link: string) => {
    setLocation(link);
    onClose();
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'PACIENTE':
        return <User className="w-4 h-4 text-bhon-teal" />;
      case 'AGENDA':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'TRATAMENTO':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'ORCAMENTO':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-md border border-bhon-border shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Input Bar */}
        <div className="p-3.5 border-b border-bhon-border flex items-center gap-3 bg-slate-50">
          <Search className="w-4 h-4 text-bhon-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por paciente, prontuário (#03945), procedimento ou orçamento..."
            className="w-full bg-transparent text-sm text-bhon-text focus:outline-none placeholder:text-bhon-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-bhon-muted hover:text-bhon-text">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="font-mono-data text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-xs text-bhon-muted">
              Digite pelo menos 2 caracteres para pesquisar em toda a operação clínica.
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-bhon-muted">
              Nenhum resultado encontrado para "<span className="font-semibold text-bhon-text">{query}</span>".
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((res) => (
                <div
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(res.link)}
                  className="p-2.5 rounded hover:bg-slate-50 border border-transparent hover:border-bhon-border cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-slate-100 group-hover:bg-white border border-slate-200">
                      {renderIcon(res.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-bhon-text">{res.title}</span>
                        {res.badge && (
                          <span className="font-mono-data text-[10px] px-1.5 py-0.2 rounded border bg-slate-100 text-slate-600 border-slate-200">
                            {res.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-bhon-muted mt-0.5">{res.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-bhon-muted group-hover:text-bhon-teal transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 border-t border-bhon-border flex items-center justify-between text-[11px] text-bhon-muted">
          <span>Busca global integrada ao banco relacional</span>
          <span className="font-mono-data">Navegação direta por entidade</span>
        </div>
      </div>
    </div>
  );
};
