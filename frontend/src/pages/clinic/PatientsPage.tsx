import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { AlertTriangle, ArrowRight, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import type { Patient, PatientStatus } from '../../types';
import { createPatient, importPatients, listPatients, type CreatePatientInput } from '../../lib/clinic';
import { useAuth } from '../../context/AuthContext';
import { hasClinicPermission } from '../../lib/permissions';

export const PatientsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const canCreatePatient = hasClinicPermission(currentUser, 'patients.create');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'ALL'>('ALL');
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<CreatePatientInput[]>([]);
  const [importing, setImporting] = useState(false);

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

  const readCsv = async (file: File) => {
    const text = await file.text();
    const [header, ...lines] = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const columns = header.split(/[;,]/).map((value) => value.trim().toLowerCase());
    const valueAt = (values: string[], aliases: string[]) => values[columns.findIndex((column) => aliases.includes(column))] || '';
    const rows = lines.filter(Boolean).map((line) => {
      const values = line.split(/[;,]/).map((value) => value.trim());
      return { name: valueAt(values, ['nome', 'nome completo']), phone: valueAt(values, ['telefone', 'celular', 'whatsapp']), email: valueAt(values, ['email', 'e-mail']), cpf: valueAt(values, ['cpf']), birthDate: valueAt(values, ['nascimento', 'data de nascimento']), allergies: valueAt(values, ['alergias']), observations: valueAt(values, ['observações', 'observacoes']), source: valueAt(values, ['origem']) || 'Importação' };
    }).filter((row) => row.name);
    setImportRows(rows);
  };

  const confirmImport = async () => {
    if (!importRows.length || importing) return;
    setImporting(true); setError('');
    try { await importPatients(importRows); setIsImportOpen(false); setImportRows([]); setReloadKey((value) => value + 1); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível importar a planilha.'); }
    finally { setImporting(false); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cabeçalho do Módulo de Pacientes */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-bhon-teal-dark">Cuidado contínuo</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-bhon-text">Pacientes</h1>
          <p className="mt-1 text-sm text-bhon-muted">Encontre rapidamente informações, histórico e próximos passos.</p>
        </div>

        {canCreatePatient ? <div className="flex gap-2 self-start sm:self-auto"><button onClick={() => setIsImportOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-bhon-border bg-white px-4 text-sm font-semibold text-bhon-text"><Upload className="h-4 w-4" />Importar</button><button
          onClick={() => setIsNewPatientOpen(true)}
          aria-label="Novo paciente"
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-bhon-navy px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bhon-navy-hover sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo paciente</span>
        </button></div> : null}
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
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-bhon-border bg-white p-3 shadow-[0_8px_28px_rgba(30,64,75,0.04)] sm:flex-row">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-bhon-muted absolute left-3 top-2.5" />
          <input
            type="text"
            aria-label="Buscar pacientes"
            name="patientSearch"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, prontuário ou telefone"
            className="min-h-11 w-full rounded-xl border border-bhon-border py-2 pl-9 pr-3 text-sm text-bhon-text placeholder:text-bhon-muted focus:border-bhon-teal focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            aria-label="Filtrar pacientes por status"
            name="patientStatus"
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
      <section aria-label="Lista de pacientes" className="overflow-hidden rounded-2xl border border-bhon-border bg-white shadow-[0_10px_32px_rgba(30,64,75,0.05)]">
        {!loading && patients.length > 0 ? <div className="divide-y divide-bhon-border md:hidden">{patients.map((patient) => <button key={patient.id} type="button" aria-label={`Abrir prontuário de ${patient.name}`} onClick={() => setLocation(`/clinic/patients/${patient.id}`)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-bhon-bg"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bhon-teal-subtle text-sm font-bold text-bhon-teal-dark">{patient.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-bhon-text">{patient.name}</span><span className="mt-0.5 block truncate text-xs text-bhon-muted">{patient.phone || 'Sem telefone'} · {patient.recordNumber}</span><span className="mt-1 block truncate text-xs text-bhon-teal-dark">{patient.nextAction || 'Aguardando próximo atendimento'}</span></span><ArrowRight className="h-4 w-4 text-bhon-muted" /></button>)}</div> : null}
        <div className="hidden overflow-x-auto md:block">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Contato</th>
                <th>Cuidado atual</th>
                <th>Próxima Ação</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && patients.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-xs text-bhon-muted">Carregando prontuários…</td></tr>
              )}
              {!loading && patients.length === 0 && !error && (
                <tr><td colSpan={5} className="py-10 text-center text-xs text-bhon-muted">Nenhum paciente encontrado para estes filtros.</td></tr>
              )}
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap"><p className="font-bold text-bhon-text">{p.name}</p><span className="font-mono-data text-[10px] text-bhon-muted">{p.recordNumber}</span></td>
                  <td className="whitespace-nowrap font-mono-data text-xs text-bhon-text">
                    {p.phone || '—'}
                  </td>
                  <td className="max-w-sm"><p className="truncate text-xs font-medium text-bhon-text" title={p.currentTreatment}>{p.currentTreatment || 'Sem plano ativo'}</p><p className="mt-1 truncate text-[10px] text-bhon-muted">{p.responsibleName || 'Sem responsável'} · {p.lastAppointmentAt ? `último em ${new Date(p.lastAppointmentAt).toLocaleDateString('pt-BR')}` : 'sem atendimento anterior'}</p><div className="mt-1"><StatusBadge status={p.status} size="sm" /></div></td>
                  <td className="max-w-xs truncate text-xs text-bhon-teal-dark font-medium" title={p.nextAction}>
                    {p.nextAction || 'Aguardando agendamento'}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      aria-label={`Abrir prontuário de ${p.name}`}
                      onClick={() => {
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
      </section>

      {/* Drawer de Cadastro de Novo Paciente */}
      <Drawer
        isOpen={canCreatePatient && isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        title="Novo paciente"
        subtitle="Comece pelo essencial. Os demais dados podem ser preenchidos depois."
        width="max-w-lg"
      >
        <form onSubmit={handleCreatePatient} className="space-y-6 text-xs">
          <section className="space-y-3"><div><h2 className="text-sm font-semibold text-bhon-text">Informações essenciais</h2><p className="mt-1 text-xs text-bhon-muted">Identificação básica do paciente.</p></div>
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
          </section>

          <section className="space-y-3"><div><h2 className="text-sm font-semibold text-bhon-text">Contato</h2><p className="mt-1 text-xs text-bhon-muted">Canais usados para confirmações e acompanhamento.</p></div>
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
          </section>

          <section className="space-y-3"><div><h2 className="text-sm font-semibold text-bhon-text">Contexto do atendimento</h2><p className="mt-1 text-xs text-bhon-muted">Informações opcionais para preparar a equipe.</p></div>
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
            <label className="block font-semibold text-bhon-text mb-1">Alergias e restrições</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Medicamentos, materiais ou condições relevantes"
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <div>
            <label className="block font-semibold text-bhon-text mb-1">Observações iniciais</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Motivo do contato ou informação importante"
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
          >
            {submitting ? 'Salvando prontuário…' : 'Salvar e Abrir Prontuário'}
          </button>
        </form>
      </Drawer>
      <Drawer isOpen={canCreatePatient && isImportOpen} onClose={() => setIsImportOpen(false)} title="Importar pacientes" subtitle="Revise os dados antes de confirmar o cadastro." width="max-w-lg">
        <div className="space-y-4 text-xs"><div className="rounded-xl border border-bhon-border bg-bhon-bg p-4"><p className="font-semibold text-bhon-text">Estrutura da planilha</p><p className="mt-1 text-bhon-muted">Envie um CSV com a coluna <strong>nome</strong>. Opcionalmente: telefone, email, cpf, nascimento, alergias, observações e origem. Exporte a planilha do Excel ou do sistema anterior como CSV.</p></div><input aria-label="Selecionar planilha CSV" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readCsv(file); }} className="block w-full text-xs" />{importRows.length ? <><p className="font-semibold text-bhon-text">Prévia: {importRows.length} pacientes</p><ul className="max-h-40 space-y-1 overflow-auto rounded border border-bhon-border p-3 text-bhon-muted">{importRows.slice(0, 8).map((row, index) => <li key={`${row.name}-${index}`}>{row.name} {row.phone ? `· ${row.phone}` : ''}</li>)}</ul><button type="button" onClick={() => void confirmImport()} disabled={importing} className="w-full rounded bg-bhon-teal py-2.5 font-bold text-white disabled:opacity-50">{importing ? 'Importando…' : 'Confirmar importação'}</button></> : null}</div>
      </Drawer>
    </div>
  );
};
