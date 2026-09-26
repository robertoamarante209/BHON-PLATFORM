import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { SectionState } from '../../components/common/SectionState';
import { useAuth } from '../../context/AuthContext';
import {
  changeSarahOpportunity, listSarahOpportunities, manualWhatsAppUrl, prepareSarahDraft,
  recordSarahConsent, sarahEventSummary, sarahQueueState,
  type ConsentSource, type SarahOpportunity, type SarahQueue, type SarahTemplate,
} from '../../lib/sarah-recovery';

const button = 'min-h-11 rounded-lg border border-bhon-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-bhon-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhon-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = `${button} bg-bhon-navy text-white hover:bg-bhon-navy-hover`;
const input = 'min-h-11 w-full rounded-lg border border-bhon-border bg-bhon-surface px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhon-teal';
const states = ['Agir agora', 'Sarah conduzindo', 'Encerrado'] as const;
const templateLabels: Record<string, string> = { CONTINUE: 'Convite de continuidade', RESCHEDULE: 'Encontrar novo horário', FINAL_INVITATION: 'Convite final' };
const consentLabel = (status: string) => status === 'ACTIVE' ? 'Consentimento registrado' : status === 'REVOKED' ? 'Consentimento revogado' : 'Sem consentimento';
const dateLabel = (value: string | null) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem data programada';
function nextAction(item: SarahOpportunity) {
  if (item.stage === 'ENDED') return 'Ciclo encerrado';
  if (item.stage === 'HUMAN_HANDOFF') return 'Atendimento pela equipe humana';
  if (item.consentStatus !== 'ACTIVE') return 'Verificar autorização de contato';
  return item.outboundEligible ? 'Revisar um rascunho comercial' : 'Revisão pela equipe necessária';
}

function OpportunityReview({ item, templates, onClose, onRefresh }: {
  item: SarahOpportunity; templates: SarahTemplate[]; onClose: () => void; onRefresh: () => void;
}) {
  const { currentUser } = useAuth();
  const canAct = ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(currentUser.role);
  const canConsent = ['OWNER', 'ADMIN', 'MANAGER'].includes(currentUser.role);
  const eligible = canAct && item.outboundEligible && item.consentStatus === 'ACTIVE' && item.activeSequence?.status === 'ACTIVE' && !['ENDED', 'HUMAN_HANDOFF'].includes(item.stage);
  const panel = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const [templateId, setTemplateId] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmation, setConfirmation] = useState<'handoff' | 'opt-out' | 'consent' | null>(null);
  const [source, setSource] = useState<ConsentSource | ''>('');
  const [policyVersion, setPolicyVersion] = useState('');
  const [explicit, setExplicit] = useState(false);
  const template = templates.find((entry) => entry.id === templateId);
  const whatsappUrl = eligible && draft ? manualWhatsAppUrl(item.patient?.phone, draft) : null;
  useEffect(() => {
    mounted.current = true;
    panel.current?.focus();
    return () => { mounted.current = false; };
  }, []);

  async function prepare() {
    if (!eligible || !reviewed || !template || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setDraft('');
    try {
      const result = await prepareSarahDraft(item.id, template.text);
      if (mounted.current) { setDraft(result.data.text); setFeedback('Rascunho aprovado para abertura manual.'); }
    } catch {
      if (mounted.current) setError('Não foi possível preparar o rascunho. Atualize a fila e verifique a autorização.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function confirm() {
    if (!confirmation || inFlight.current) return;
    if (confirmation === 'consent' && (!canConsent || !source || !explicit || !/^[a-zA-Z0-9._-]{1,64}$/.test(policyVersion))) return;
    if (confirmation !== 'consent' && !canAct) return;
    inFlight.current = true; setBusy(true); setError(''); setDraft('');
    try {
      if (confirmation === 'consent') await recordSarahConsent(item.patientId, source as ConsentSource, policyVersion);
      else await changeSarahOpportunity(item.id, confirmation);
      // Refresh even if the operator changed focus while the mutation was pending.
      onRefresh();
    } catch {
      if (mounted.current) setError('Não foi possível confirmar a alteração. Atualize a fila antes de tentar novamente.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(draft);
      if (mounted.current) setFeedback('Mensagem copiada.');
    } catch {
      if (mounted.current) setError('Não foi possível copiar. Selecione e copie a mensagem aprovada abaixo.');
    }
  }

  return <section ref={panel} tabIndex={-1} aria-label={`Revisão de ${item.patient?.name ?? 'paciente indisponível'}`} className="min-w-0 rounded-xl border border-bhon-border bg-bhon-surface p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhon-teal sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">{item.patient?.name ?? 'Paciente indisponível'}</h2><p className="mt-1 text-sm text-bhon-muted">{item.patient?.phone || 'Telefone não informado'}</p></div>
      <button type="button" className={button} onClick={onClose}>Fechar revisão</button>
    </div>
    <div className="mt-5 flex flex-col gap-5 text-sm leading-6">
      <p>{consentLabel(item.consentStatus)} · {nextAction(item)}</p>
      {!eligible && <p id="sarah-blocked" className="rounded-lg bg-bhon-bg p-3">{item.consentStatus === 'MISSING' ? 'Sem consentimento: a mensagem não pode ser preparada.' : item.consentStatus === 'REVOKED' ? 'Consentimento revogado: a mensagem não pode ser preparada.' : !canAct ? 'Seu perfil permite apenas consultar esta fila.' : 'Esta oportunidade não permite preparar mensagens. É necessária uma sequência ativa e autorização válida.'}</p>}
      {eligible && <>
        <label className="flex flex-col gap-2">Modelo publicado<select className={input} value={templateId} disabled={busy} onChange={(event) => { setTemplateId(event.target.value); setReviewed(false); setDraft(''); setFeedback(''); }}><option value="">Selecione um modelo</option>{templates.map((entry) => <option key={entry.id} value={entry.id}>{templateLabels[entry.id] ?? 'Modelo comercial aprovado'}</option>)}</select></label>
        {template && <p className="whitespace-pre-wrap break-words rounded-lg bg-bhon-bg p-4">{template.text}</p>}
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5 shrink-0" checked={reviewed} disabled={!template || busy} onChange={(event) => { setReviewed(event.target.checked); setDraft(''); }} />Revisei a mensagem e confirmo o uso deste modelo.</label>
      </>}
      <button type="button" className={`${primaryButton} self-start`} disabled={!eligible || !reviewed || !template || busy} aria-describedby={!eligible ? 'sarah-blocked' : undefined} onClick={() => void prepare()}>{busy && !confirmation ? 'Preparando rascunho…' : 'Preparar rascunho'}</button>
      {draft && eligible && <div className="flex flex-col gap-3">
        <h3 className="font-semibold">Mensagem aprovada</h3><p className="whitespace-pre-wrap break-words rounded-lg bg-bhon-bg p-4">{draft}</p>
        <p>A abertura da conversa é manual. Confira o destinatário e a mensagem no WhatsApp antes de decidir pelo envio.</p>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => void copy()}>Copiar mensagem</button>{whatsappUrl && <a className={button} href={whatsappUrl} target="_blank" rel="noopener noreferrer">Abrir WhatsApp <span className="sr-only">em nova aba</span></a>}</div>
        {!whatsappUrl && <p>Telefone brasileiro inválido ou ausente. A abertura do WhatsApp está indisponível.</p>}
      </div>}
      {canAct && <div className="flex flex-wrap gap-2 border-t border-bhon-border pt-5">
        {!['ENDED', 'HUMAN_HANDOFF'].includes(item.stage) && <button type="button" className={button} disabled={busy} onClick={() => setConfirmation('handoff')}>Transferir para equipe</button>}
        {item.consentStatus !== 'REVOKED' && <button type="button" className={button} disabled={busy} onClick={() => setConfirmation('opt-out')}>Registrar recusa de contato</button>}
        {canConsent && item.consentStatus !== 'ACTIVE' && <button type="button" className={button} disabled={busy} onClick={() => setConfirmation('consent')}>Registrar consentimento</button>}
      </div>}
      {confirmation && <fieldset className="flex min-w-0 flex-col gap-3 rounded-lg border border-bhon-border p-4" disabled={busy}>
        <legend className="px-1 font-semibold">{confirmation === 'handoff' ? 'Confirmar transferência' : confirmation === 'opt-out' ? 'Confirmar recusa' : 'Registrar autorização explícita'}</legend>
        <p>{confirmation === 'handoff' ? 'A condução pela Sarah será encerrada nesta oportunidade. A equipe assume o atendimento.' : confirmation === 'opt-out' ? 'O consentimento será revogado e todos os ciclos deste paciente serão encerrados.' : 'Registre apenas uma autorização já concedida pelo paciente para contato comercial via WhatsApp. Isso não inicia um novo ciclo.'}</p>
        {confirmation === 'consent' && <>
          <label className="flex flex-col gap-2">Origem do consentimento<select className={input} value={source} onChange={(event) => setSource(event.target.value as ConsentSource)}><option value="">Selecione a origem</option><option value="SIGNED_FORM">Termo assinado</option><option value="IN_PERSON">Presencial</option><option value="WHATSAPP">WhatsApp</option><option value="PHONE">Telefone</option></select></label>
          <label className="flex flex-col gap-2">Versão da política aceita<input className={input} value={policyVersion} maxLength={64} onChange={(event) => setPolicyVersion(event.target.value)} aria-describedby="sarah-policy-help" /></label>
          <p id="sarah-policy-help">Use a versão registrada pela clínica: letras, números, ponto, hífen ou sublinhado.</p>
          <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={explicit} onChange={(event) => setExplicit(event.target.checked)} />Confirmo que o paciente autorizou explicitamente o contato comercial via WhatsApp.</label>
        </>}
        <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setConfirmation(null)}>Cancelar</button><button type="button" className={primaryButton} disabled={busy || (confirmation === 'consent' && (!source || !explicit || !/^[a-zA-Z0-9._-]{1,64}$/.test(policyVersion)))} onClick={() => void confirm()}>{busy ? 'Confirmando…' : confirmation === 'handoff' ? 'Confirmar transferência' : confirmation === 'opt-out' ? 'Confirmar recusa' : 'Confirmar consentimento'}</button></div>
      </fieldset>}
      <p aria-live="polite" role="status">{busy ? 'Operação em andamento…' : feedback}</p>
      {error && <p role="alert" className="text-bhon-critical">{error}</p>}
      <div className="border-t border-bhon-border pt-5"><h3 className="font-semibold">Histórico resumido</h3><p className="mt-1 text-bhon-muted">Somente eventos operacionais; conteúdo das conversas omitido.</p>{item.events.length ? <ul className="mt-3 flex flex-col gap-3">{item.events.map((event) => <li key={event.id}><p>{sarahEventSummary(event.kind)}</p><p className="text-bhon-muted">{dateLabel(event.occurredAt)}</p></li>)}</ul> : <p className="mt-3 text-bhon-muted">Sem eventos registrados.</p>}</div>
    </div>
  </section>;
}

export const SarahRecoveryPage: React.FC = () => {
  const [, navigate] = useLocation();
  const search = useSearch();
  const focusId = new URLSearchParams(search).get('focus');
  const [queue, setQueue] = useState<SarahQueue | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setQueue(null); setError(false); setRevision((value) => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setQueue(null); setError(false);
    listSarahOpportunities(controller.signal).then((result) => {
      if (active) setQueue(result);
    }).catch(() => { if (active) { setQueue(null); setError(true); } });
    return () => { active = false; controller.abort(); };
  }, [revision]);
  const selected = queue?.data.find((item) => item.id === focusId);
  const select = (id?: string) => {
    const params = new URLSearchParams(search);
    if (id) params.set('focus', id); else params.delete('focus');
    navigate(`/clinic/sarah${params.size ? `?${params}` : ''}`);
  };
  return <div className="flex flex-col gap-6 text-bhon-text">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Sarah</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-bhon-muted">Recuperação com revisão humana. Organize a próxima ação e prepare mensagens para abertura manual no WhatsApp.</p></div><button type="button" className={button} onClick={refresh} disabled={!queue && !error}>Atualizar fila</button></header>
    {error ? <div role="alert" className="rounded-xl border border-bhon-border bg-bhon-surface p-6"><h2 className="font-semibold">Não foi possível carregar a fila da Sarah.</h2><p className="mt-2 text-sm text-bhon-muted">Os dados estão indisponíveis. Tente novamente para consultar uma fila atualizada.</p><button type="button" className={`${button} mt-4`} onClick={refresh}>Tentar novamente</button></div> : !queue ? <p role="status" aria-live="polite" className="py-8 text-bhon-muted">Carregando fila da Sarah…</p> : <>
      {selected && <OpportunityReview key={`${selected.id}:${revision}`} item={selected} templates={queue.draftTemplates} onClose={() => select()} onRefresh={refresh} />}
      {focusId && !selected && <p role="status">A oportunidade solicitada não está disponível nesta fila.</p>}
      <div className="grid min-w-0 gap-4 xl:grid-cols-3">{states.map((state) => {
        const items = queue.data.filter((item) => sarahQueueState(item) === state);
        return <section key={state} aria-label={state} className="min-w-0 rounded-xl border border-bhon-border bg-bhon-surface">
          <div className="border-b border-bhon-border p-4"><h2 className="text-lg font-semibold">{state} <span className="ml-2 text-sm tabular-nums text-bhon-muted">{items.length}</span></h2>{state === 'Sarah conduzindo' && <p className="mt-1 text-sm leading-6 text-bhon-muted">Sequência ativa; os contatos dependem da equipe.</p>}</div>
          {items.length ? <ul className="divide-y divide-bhon-border">{items.map((item) => <li key={item.id} className="flex flex-col gap-3 p-4 text-sm leading-6">
            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-semibold">{item.patient?.name ?? 'Paciente indisponível'}</h3><span className="rounded bg-bhon-bg px-2 tabular-nums">Prioridade {item.priorityScore}</span></div>
            <p className="break-words text-bhon-muted">{item.patient?.phone || 'Telefone não informado'}</p><p>{consentLabel(item.consentStatus)}</p>
            <p>{nextAction(item)}<span className="block text-bhon-muted">{dateLabel(item.nextActionAt)}</span></p>
            <button type="button" className={`${button} self-start`} aria-label={`Revisar ${item.patient?.name ?? 'paciente indisponível'}`} aria-expanded={focusId === item.id} onClick={() => select(item.id)}>Revisar oportunidade</button>
          </li>)}</ul> : <SectionState icon={Inbox} title="Nenhuma oportunidade" description="As oportunidades deste estado aparecerão aqui." />}
        </section>;
      })}</div>
    </>}
  </div>;
};
