import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import * as XLSX from 'xlsx';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { AlertTriangle, ArrowRight, CheckCircle2, FileUp, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import type { Patient, PatientStatus } from '../../types';
import { commitPatientImport, createPatient, listPatients, reviewPatientImport, type PatientImportResponse, type PatientImportRow } from '../../lib/clinic';

function parseSpreadsheetCsv(text: string): PatientImportRow[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '"') {
      if (quoted && normalized[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === ';' || character === '\n')) {
      current.push(cell.trim()); cell = '';
      if (character === '\n') { rows.push(current); current = []; }
    } else cell += character;
  }
  if (cell || current.length) { current.push(cell.trim()); rows.push(current); }
  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
}

async function parsePatientSpreadsheet(file: File): Promise<PatientImportRow[]> {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])));
  }
  return parseSpreadsheetCsv(await file.text());
}

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<PatientImportRow[]>([]);
  const [importReview, setImportReview] = useState<PatientImportResponse | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
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

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setImportError('');
    setImportReview(null);
    if (!/\.(csv|txt|xlsx|xls)$/i.test(file.name)) {
      setImportError('Envie uma planilha Excel (.xlsx ou .xls) ou um CSV.');
      return;
    }
    const rows = await parsePatientSpreadsheet(file);
    if (!rows.length) { setImportError('A planilha não possui linhas de pacientes.'); return; }
    if (rows.length > 1000) { setImportError('Envie até 1.000 pacientes por vez.'); return; }
    setImporting(true);
    try {
      const review = await reviewPatientImport(rows);
      setImportRows(rows);
      setImportFileName(file.name);
      setImportReview(review);
    } catch (requestError) {
      setImportError(requestError instanceof Error ? requestError.message : 'Não foi possível revisar a planilha.');
    } finally { setImporting(false); }
  };

  const handleCommitImport = async () => {
    if (!importReview?.summary.ready || importing) return;
    setImporting(true); setImportError('');
    try {
      await commitPatientImport(importRows);
      setIsImportOpen(false); setImportRows([]); setImportReview(null); setImportFileName('');
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setImportError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir a importação.');
    } finally { setImporting(false); }
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={() => setIsImportOpen(true)} className="px-3 py-1.5 border border-bhon-border text-bhon-navy hover:border-bhon-teal text-xs font-bold rounded flex items-center gap-1.5 transition-colors">
            <Upload className="w-4 h-4" /><span>Importar planilha</span>
          </button>
          <button onClick={() => setIsNewPatientOpen(true)} className="px-3.5 py-1.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors uppercase tracking-wider">
            <Plus className="w-4 h-4" /><span>Novo paciente</span>
          </button>
        </div>
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
            aria-label="Buscar pacientes"
            name="patientSearch"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, prontuário (#03945) ou telefone..."
            className="w-full pl-9 pr-3 py-1.5 border border-bhon-border rounded text-xs text-bhon-text placeholder:text-bhon-muted focus:outline-none focus:border-bhon-teal"
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
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
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

      <Drawer isOpen={isImportOpen} onClose={() => { if (!importing) setIsImportOpen(false); }} title="Importar pacientes" subtitle="Revise os dados antes de criar qualquer prontuário" width="max-w-2xl">
        <div className="space-y-4 text-xs">
          {!importReview && (
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded border border-dashed border-bhon-border bg-slate-50 px-5 text-center hover:border-bhon-teal">
              <FileUp className="h-7 w-7 text-bhon-teal" />
              <span className="font-semibold text-bhon-text">Envie a planilha de pacientes</span>
              <span className="text-bhon-muted">Colunas aceitas: nome, CPF, telefone, e-mail, data de nascimento, origem, alergias e observações.</span>
              <input className="sr-only" type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={(event) => void handleImportFile(event.target.files?.[0])} />
            </label>
          )}
          {importError && <p className="rounded border border-rose-200 bg-rose-50 p-3 text-rose-900" role="alert">{importError}</p>}
          {importing && <p className="text-bhon-muted">Revisando planilha…</p>}
          {importReview && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {[['Linhas', importReview.summary.total], ['Prontas', importReview.summary.ready], ['Duplicadas', importReview.summary.duplicate], ['Ajustar', importReview.summary.invalid]].map(([label, count]) => <div key={String(label)} className="rounded border border-bhon-border bg-white p-2.5"><p className="text-bhon-muted">{label}</p><p className="mt-1 font-mono-data text-base font-bold text-bhon-text">{count}</p></div>)}
              </div>
              <p className="text-bhon-muted">Arquivo: <strong className="text-bhon-text">{importFileName}</strong>. Linhas duplicadas ou inválidas não serão importadas.</p>
              <div className="max-h-60 overflow-auto rounded border border-bhon-border">
                <table className="bhon-table"><thead><tr><th>Linha</th><th>Paciente</th><th>Status</th><th>Revisão</th></tr></thead><tbody>{importReview.review.map((item) => <tr key={item.row}><td className="font-mono-data">{item.row}</td><td>{item.data.name || '—'}</td><td><span className={item.status === 'ready' ? 'text-emerald-700' : 'text-amber-700'}>{item.status === 'ready' ? 'Pronta' : item.status === 'duplicate' ? 'Duplicada' : 'Ajustar'}</span></td><td className="text-bhon-muted">{item.errors.join(' ') || (item.status === 'duplicate' ? 'Já existe um prontuário correspondente.' : 'Cadastro pronto.')}</td></tr>)}</tbody></table>
              </div>
              <button type="button" disabled={importing || importReview.summary.ready === 0} onClick={() => void handleCommitImport()} className="flex w-full items-center justify-center gap-2 rounded bg-bhon-teal py-2.5 font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Importar {importReview.summary.ready} prontuário{importReview.summary.ready === 1 ? '' : 's'} revisado{importReview.summary.ready === 1 ? '' : 's'}</button>
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
};
