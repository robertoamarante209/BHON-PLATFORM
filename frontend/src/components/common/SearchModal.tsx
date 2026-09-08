import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, User, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { listPatients } from '../../lib/clinic';
import type { Patient } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [results, setResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(focusTimer);
    }
    setQuery('');
    setResults([]);
    setError('');
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (isOpen) onClose();
      }
      if (event.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || deferredQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    void listPatients({ search: deferredQuery, limit: 8 }, controller.signal)
      .then((response) => setResults(response.data))
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setResults([]);
        setError('Não foi possível consultar o cadastro agora.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [deferredQuery, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (patientId: string) => {
    setLocation(`/clinic/patients/${patientId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bhon-navy/65 p-4 pt-[10vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="patient-search-title" className="w-full max-w-2xl overflow-hidden rounded-[22px] border border-white/30 bg-bhon-surface shadow-[0_32px_100px_rgba(8,17,31,0.35)]">
        <h2 id="patient-search-title" className="sr-only">Buscar pacientes</h2>
        <div className="flex items-center gap-3 border-b border-bhon-border bg-[#F8F5EF] p-4">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-bhon-muted" />
          <label className="sr-only" htmlFor="patient-search">Nome ou número do prontuário</label>
          <input
            ref={inputRef}
            id="patient-search"
            name="patient-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou número do prontuário…"
            className="w-full border-0 bg-transparent text-sm text-bhon-text placeholder:text-bhon-muted"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" className="rounded-full p-1 text-bhon-muted transition-colors hover:bg-white hover:text-bhon-text">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
          <kbd className="rounded border border-bhon-border bg-white px-1.5 py-0.5 font-mono-data text-[10px] text-bhon-muted">ESC</kbd>
        </div>

        <div className="max-h-[55vh] min-h-44 overflow-y-auto overscroll-contain p-2" aria-live="polite">
          {deferredQuery.length < 2 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-display text-xl text-bhon-navy">Encontre um paciente</p>
              <p className="mt-2 text-xs text-bhon-muted">Digite ao menos dois caracteres para pesquisar no cadastro clínico.</p>
            </div>
          ) : isLoading ? (
            <div className="px-6 py-12 text-center text-xs text-bhon-muted">Consultando cadastro…</div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-xs text-rose-700" role="alert">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-bhon-muted">
              Nenhum paciente encontrado para “<span className="font-semibold text-bhon-text">{deferredQuery}</span>”.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((patient) => (
                <button
                  type="button"
                  key={patient.id}
                  onClick={() => handleSelect(patient.id)}
                  className="group flex w-full items-center justify-between rounded-xl border border-transparent p-3 text-left transition-[background-color,border-color] hover:border-bhon-border hover:bg-bhon-bg"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bhon-border bg-white text-bhon-teal"><User aria-hidden="true" className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-bhon-text">{patient.name}</span>
                      <span className="mt-1 block truncate font-mono-data text-[10px] text-bhon-muted">{patient.recordNumber}{patient.phone ? ` · ${patient.phone}` : ''}</span>
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-bhon-muted transition-colors group-hover:text-bhon-teal" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-bhon-border bg-[#F8F5EF] px-4 py-3 text-[10px] text-bhon-muted">
          <span>Busca segura no cadastro clínico</span>
          <span className="hidden font-mono-data sm:inline">Acesso direto ao prontuário</span>
        </div>
      </section>
    </div>
  );
};
