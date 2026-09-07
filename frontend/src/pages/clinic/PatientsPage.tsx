import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { AlertTriangle, ArrowRight, Plus, RefreshCw, Search } from 'lucide-react';
import type { Patient, PatientStatus } from '../../types';
import { createPatient, listPatients } from '../../lib/clinic';

export const PatientsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'ALL'>('ALL');
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);

  // Form State para Novo Paciente
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [allergies, setAllergies] = useState('');
  const [observations, setObservations] = useState('');
  const [source, setSource] = useState('Indicação de Paciente');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      void listPatients({
        search: searchTerm.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      }, controller.signal)
        .then((response) => {
          setPatients(response.data);
          setTotalPatients(response.pagination.total);
        })
        .catch((requestError) => {
          if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
          setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os pacientes.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchTerm, statusFilter, reloadKey]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const newPatient = await createPatient({ name: name.trim(), cpf, phone, email, birthDate: birthDate || undefined, allergies, observations, source });
      setIsNewPatientOpen(false);
      setName(''); setCpf(''); setPhone(''); setEmail(''); setBirthDate(''); setAllergies(''); setObservations('');
      setLocation(`/clinic/patients/${newPatient.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível cadastrar o paciente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho do Módulo de Pacientes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Dossiê de Pacientes
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Cadastro unificado, prontuários clínicos e histórico integrado de tratamentos.
          </p>
        </div>

        <button
          onClick={() => setIsNewPatientOpen(true)}
          className="px-3.5 py-1.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors uppercase tracking-wider self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Paciente</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-1 border border-rose-300 bg-white px-2.5 py-1.5 font-semibold transition-transform duration-150 active:scale-[0.97]">
            <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
          </button>
        </div>
      )}

      {/* Barra de Filtro e Busca Rápida */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-bhon-border rounded">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-bhon-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, prontuário (#03945) ou telefone..."
            className="w-full pl-9 pr-3 py-1.5 border border-bhon-border rounded text-xs text-bhon-text placeholder:text-bhon-muted focus:outline-none focus:border-bhon-teal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PatientStatus | 'ALL')}
            className="px-2.5 py-1.5 border border-bhon-border rounded text-xs text-bhon-text bg-white"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
            <option value="ARCHIVED">Arquivados</option>
          </select>
          <span className="font-mono-data text-xs text-bhon-muted whitespace-nowrap">
            {totalPatients} paciente{totalPatients === 1 ? '' : 's'} encontrado{totalPatients === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Tabela de Pacientes (Prompt Seção 17: Colunas Mandatórias) */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Prontuário</th>
                <th>Contato</th>
                <th>Último Atendimento</th>
                <th>Tratamento Atual</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Próxima Ação</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && patients.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-xs text-bhon-muted">Carregando prontuários…</td></tr>
              )}
              {!loading && patients.length === 0 && !error && (
                <tr><td colSpan={9} className="py-10 text-center text-xs text-bhon-muted">Nenhum paciente encontrado para estes filtros.</td></tr>
              )}
              {patients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setLocation(`/clinic/patients/${p.id}`)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="font-bold text-bhon-text whitespace-nowrap">
                    {p.name}
                  </td>
                  <td className="font-mono-data text-bhon-muted whitespace-nowrap">
                    {p.recordNumber}
                  </td>
                  <td className="whitespace-nowrap font-mono-data text-xs text-bhon-text">
                    {p.phone || '—'}
                  </td>
                  <td className="font-mono-data text-xs text-bhon-muted whitespace-nowrap">
                    {p.lastAppointmentAt
                      ? new Date(p.lastAppointmentAt).toLocaleDateString('pt-BR')
                      : 'Sem registro'}
                  </td>
                  <td className="max-w-xs truncate text-xs font-medium text-bhon-text" title={p.currentTreatment}>
                    {p.currentTreatment || 'Nenhum ativo'}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {p.responsibleName || 'Não atribuído'}
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="max-w-xs truncate text-xs text-bhon-teal-dark font-medium" title={p.nextAction}>
                    {p.nextAction || 'Aguardando agendamento'}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/clinic/patients/${p.id}`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-bhon-navy bg-slate-100 hover:bg-bhon-navy hover:text-white rounded border border-bhon-border transition-colors inline-flex items-center gap-1"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de Cadastro de Novo Paciente */}
      <Drawer
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        title="Cadastrar Novo Paciente"
        subtitle="Abertura de prontuário e ficha cadastral inicial"
        width="max-w-lg"
      >
        <form onSubmit={handleCreatePatient} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-bhon-text mb-1">Nome Completo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo de Oliveira"
              required
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-bhon-text mb-1">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-2.5 py-2 border border-bhon-border rounded font-mono-data text-bhon-text"
              />
            </div>
            <div>
              <label className="block font-semibold text-bhon-text mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-bhon-border rounded font-mono-data text-bhon-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-bhon-text mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-2.5 py-2 border border-bhon-border rounded font-mono-data text-bhon-text"
              />
            </div>
            <div>
              <label className="block font-semibold text-bhon-text mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paciente@email.com"
                className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-bhon-text mb-1">Origem do Paciente</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white text-bhon-text"
            >
              <option value="Indicação de Paciente">Indicação de Paciente</option>
              <option value="Instagram">Instagram</option>
              <option value="Google Ads / Busca">Google Ads / Busca</option>
              <option value="Parceria Médica">Parceria Médica</option>
              <option value="Passante / Fachada">Passante / Fachada</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-bhon-text mb-1">Alergias e Restrições Médicas</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ex: Alérgico a Penicilina, Dipirona, Látex..."
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <div>
            <label className="block font-semibold text-bhon-text mb-1">Observações Clínicas Iniciais</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Histórico prévio, queixa principal relatada..."
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
          >
            {submitting ? 'Salvando prontuário…' : 'Salvar e Abrir Prontuário'}
          </button>
        </form>
      </Drawer>
    </div>
  );
};

