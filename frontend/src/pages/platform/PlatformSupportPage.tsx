import React, { useState } from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { LifeBuoy, Search, CheckCircle2, Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import { SupportTicket } from '../../types';

export const PlatformSupportPage: React.FC = () => {
  const { supportTickets, updateTicketStatus } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const filteredTickets = supportTickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = (newStatus: SupportTicket['status']) => {
    if (selectedTicket) {
      updateTicketStatus(selectedTicket.id, newStatus);
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Suporte Técnico às Clínicas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Fila de chamados de atendimento, incidentes operacionais e solicitações de clínicas clientes.
          </p>
        </div>

        <span className="font-mono-data text-xs text-slate-400 self-start sm:self-auto">
          {supportTickets.filter(t => t.status !== 'RESOLVED').length} chamados em aberto
        </span>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 border border-slate-800 rounded">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, clínica ou descrição do chamado..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-800 bg-slate-900 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-800 bg-slate-900 rounded text-xs text-slate-200"
          >
            <option value="ALL">Todos os status</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="RESOLVED">Resolvidos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Chamados Mandatória do Master Prompt (Seção 35) */}
      <div className="bg-slate-950 border border-slate-800 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono-data">
                <th className="p-3">Prioridade</th>
                <th className="p-3">Assunto do Chamado</th>
                <th className="p-3">Clínica Solicitante</th>
                <th className="p-3">Aberto Por</th>
                <th className="p-3">Status</th>
                <th className="p-3">Abertura</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                >
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={ticket.priority} size="sm" />
                  </td>
                  <td className="p-3 font-bold text-white max-w-sm truncate">
                    {ticket.title}
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {ticket.clinicName}
                  </td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {ticket.openedByUserName}
                  </td>
                  <td className="p-3 whitespace-nowrap font-mono-data">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        ticket.status === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : ticket.status === 'IN_PROGRESS'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono-data text-slate-500 whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                    >
                      Atender
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de Atendimento do Chamado */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Atendimento de Chamado Técnico"
        subtitle={selectedTicket ? `${selectedTicket.title} • ${selectedTicket.clinicName}` : ''}
      >
        {selectedTicket && (
          <div className="space-y-4 text-xs text-slate-200">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Prioridade:</span>
                <StatusBadge status={selectedTicket.priority} size="sm" />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Descrição do Problema:</span>
                <p className="text-white leading-relaxed p-2.5 bg-slate-950 rounded border border-slate-800 font-mono-data">
                  {selectedTicket.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Solicitante:</span>
                <span className="font-semibold text-white">{selectedTicket.openedByUserName}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[11px] text-slate-400 mb-2">
                Alterar Status do Chamado
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('OPEN')}
                  className={`p-2 rounded border text-center font-bold text-xs ${
                    selectedTicket.status === 'OPEN'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  Aberto
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('IN_PROGRESS')}
                  className={`p-2 rounded border text-center font-bold text-xs ${
                    selectedTicket.status === 'IN_PROGRESS'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  Em Andamento
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('RESOLVED')}
                  className={`p-2 rounded border text-center font-bold text-xs ${
                    selectedTicket.status === 'RESOLVED'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  Resolvido
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
