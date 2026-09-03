import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import {
  Clock,
  CheckCircle2,
  Calendar,
  Phone,
  UserCheck,
  Search,
  Filter,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { FollowUp, FollowUpCategory } from '../../types';

export const FollowUpsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { followUps, completeFollowUp, postponeFollowUp } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');

  const categories: { code: FollowUpCategory; label: string }[] = [
    { code: 'POS_OPERATORIO', label: 'Pós-operatório' },
    { code: 'CONFIRMACAO', label: 'Confirmação' },
    { code: 'RETORNO', label: 'Retorno' },
    { code: 'ORCAMENTO', label: 'Orçamento' },
    { code: 'TRATAMENTO', label: 'Tratamento' },
    { code: 'REATIVACAO', label: 'Reativação' },
    { code: 'PENDENCIA_CLINICA', label: 'Pendência clínica' },
  ];

  const filteredFollowUps = followUps.filter((fol) => {
    const matchesSearch =
      fol.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fol.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'ALL' || fol.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    completeFollowUp(selectedFollowUp.id, completionNotes);
    setSelectedFollowUp(null);
    setCompletionNotes('');
  };

  const handlePostpone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp || !newDeadlineDate) return;
    postponeFollowUp(selectedFollowUp.id, `${newDeadlineDate}T18:00:00Z`);
    setSelectedFollowUp(null);
    setNewDeadlineDate('');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Fila de Acompanhamentos Operacionais
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Monitoramento cirúrgico 48h, confirmações de presença, retornos e reativações.
          </p>
        </div>

        <span className="font-mono-data text-xs text-bhon-muted self-start sm:self-auto">
          {followUps.filter(f => f.status === 'PENDENTE').length} ações pendentes hoje
        </span>
      </div>

      {/* Categorias Obrigatórias (Seção 20) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-bhon-navy text-white'
              : 'bg-white border border-bhon-border text-bhon-muted hover:text-bhon-text'
          }`}
        >
          Todas as Categorias ({followUps.length})
        </button>

        {categories.map((cat) => {
          const count = followUps.filter((f) => f.category === cat.code).length;
          const isSelected = selectedCategory === cat.code;

          return (
            <button
              key={cat.code}
              onClick={() => setSelectedCategory(cat.code)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-bhon-teal text-white'
                  : 'bg-white border border-bhon-border text-bhon-muted hover:text-bhon-text'
              }`}
            >
              <span>{cat.label}</span>
              <span className="font-mono-data text-[10px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Tabela de Follow-ups com Campos do Master Prompt */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Categoria</th>
                <th>Motivo do Acompanhamento</th>
                <th>Responsável</th>
                <th>Prazo Limite</th>
                <th>Último Contato</th>
                <th>Próxima Ação</th>
                <th>Status</th>
                <th className="text-right">Ação Imediata</th>
              </tr>
            </thead>
            <tbody>
              {filteredFollowUps.map((fol) => (
                <tr
                  key={fol.id}
                  onClick={() => setSelectedFollowUp(fol)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="whitespace-nowrap">
                    <p className="font-bold text-bhon-text">{fol.patientName}</p>
                    <span className="font-mono-data text-[10px] text-bhon-muted">
                      {fol.patientRecordNumber}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="font-mono-data text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                      {fol.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-xs font-semibold text-bhon-text max-w-xs truncate" title={fol.reason}>
                    {fol.reason}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {fol.responsibleUserName}
                  </td>
                  <td className="font-mono-data text-xs whitespace-nowrap">
                    {new Date(fol.deadlineAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(fol.deadlineAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="font-mono-data text-xs text-bhon-muted whitespace-nowrap">
                    {fol.lastContactAt
                      ? new Date(fol.lastContactAt).toLocaleDateString('pt-BR')
                      : 'Nenhum'}
                  </td>
                  <td className="text-xs text-bhon-teal-dark font-medium max-w-xs truncate" title={fol.nextAction}>
                    {fol.nextAction || 'Registrar contato'}
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={fol.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFollowUp(fol);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-bhon-navy bg-slate-100 hover:bg-bhon-navy hover:text-white rounded border border-bhon-border transition-colors"
                    >
                      Tratar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de Ações do Follow-up (Concluir, Adiar, Reatribuir, Abrir paciente, Registrar contato) */}
      <Drawer
        isOpen={!!selectedFollowUp}
        onClose={() => setSelectedFollowUp(null)}
        title="Executar Acompanhamento Operacional"
        subtitle={selectedFollowUp ? `${selectedFollowUp.patientName} (${selectedFollowUp.patientRecordNumber})` : ''}
      >
        {selectedFollowUp && (
          <div className="space-y-4 text-xs">
            {/* Detalhes do Acompanhamento */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Categoria:</span>
                <span className="font-mono-data font-bold text-bhon-text">
                  {selectedFollowUp.category.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-bhon-muted block">Motivo Clínico:</span>
                <p className="font-bold text-bhon-text mt-0.5">{selectedFollowUp.reason}</p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-bhon-border">
                <span className="text-bhon-muted">Responsável:</span>
                <span className="font-semibold text-bhon-text">{selectedFollowUp.responsibleUserName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Prazo de Execução:</span>
                <span className="font-mono-data text-bhon-text">
                  {new Date(selectedFollowUp.deadlineAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Ação 1: Concluir Acompanhamento */}
            <form onSubmit={handleComplete} className="p-3 border border-emerald-200 bg-emerald-50/50 rounded space-y-2">
              <label className="block font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                Concluir Acompanhamento
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Descreva o desfecho do contato: paciente relatou melhora, consulta remarcada, etc..."
                rows={2}
                required
                className="w-full p-2 border border-emerald-300 rounded text-xs bg-white"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Registrar Desfecho e Concluir</span>
              </button>
            </form>

            {/* Ação 2: Adiar Prazo */}
            <form onSubmit={handlePostpone} className="p-3 border border-amber-200 bg-amber-50/50 rounded space-y-2">
              <label className="block font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                Adiar Próximo Contato
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDeadlineDate}
                  onChange={(e) => setNewDeadlineDate(e.target.value)}
                  required
                  className="flex-1 p-1.5 border border-amber-300 rounded font-mono-data text-xs bg-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition-colors whitespace-nowrap"
                >
                  Adiar Prazo
                </button>
              </div>
            </form>

            {/* Ação 3: Abrir Prontuário do Paciente */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setLocation(`/clinic/patients/${selectedFollowUp.patientId}`);
                  setSelectedFollowUp(null);
                }}
                className="w-full py-2 bg-bhon-navy text-white text-xs font-semibold rounded hover:bg-bhon-navy-hover transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Abrir Prontuário do Paciente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
