import React, { useEffect, useState } from 'react';
import { BotMessageSquare, MessageCircleMore, Plus, Send, UserRound } from 'lucide-react';
import { createSecretaryConversation, getSecretaryConversation, listSecretaryConversations, sendSecretaryMessage, type SecretaryConversation } from '../../lib/operations';

const statusLabel: Record<SecretaryConversation['status'], string> = {
  OPEN: 'Em atendimento', WAITING_DETAILS: 'Aguardando dados', HUMAN_HANDOFF: 'Equipe acionada', CLOSED: 'Encerrada',
};

export const SecretaryConsole: React.FC = () => {
  const [items, setItems] = useState<SecretaryConversation[]>([]);
  const [selected, setSelected] = useState<SecretaryConversation | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const refresh = async (selectId?: string) => {
    const conversations = await listSecretaryConversations();
    setItems(conversations);
    const currentId = selectId || selected?.id;
    if (currentId) {
      const conversation = await getSecretaryConversation(currentId);
      setSelected(conversation);
    }
  };
  useEffect(() => { void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a Sarah.')); }, []);
  const open = async (id: string) => { setError(''); try { setSelected(await getSecretaryConversation(id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a conversa.'); } };
  const start = async () => {
    const contactName = window.prompt('Nome da pessoa:')?.trim();
    const contactPhone = window.prompt('WhatsApp com DDD:')?.trim();
    if (!contactPhone) return;
    setSaving(true); setError('');
    try { const conversation = await createSecretaryConversation({ contactName: contactName || undefined, contactPhone }); await refresh(conversation.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a conversa.'); }
    finally { setSaving(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !message.trim() || saving) return;
    const content = message.trim(); setMessage(''); setSaving(true); setError('');
    try { await sendSecretaryMessage(selected.id, content); await refresh(selected.id); }
    catch (reason) { setMessage(content); setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a mensagem.'); }
    finally { setSaving(false); }
  };
  return <section className="bhon-panel overflow-hidden rounded-2xl" aria-labelledby="sarah-title">
    <header className="flex flex-col gap-4 border-b border-bhon-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bhon-teal text-[#07120F]"><BotMessageSquare className="h-5 w-5" /></span><div><p className="bhon-eyebrow">Atendimento 7x7</p><h2 id="sarah-title" className="mt-1 font-display text-xl text-bhon-navy">Secretária Sarah</h2><p className="mt-1 text-xs text-bhon-muted">Agenda, encaixes, confirmações e dúvidas operacionais com histórico da clínica.</p></div></div>
      <button type="button" onClick={() => void start()} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4 text-bhon-teal" />Nova conversa</button>
    </header>
    {error ? <p role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p> : null}
    <div className="grid min-h-[420px] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-bhon-border bg-bhon-bg/50 lg:border-b-0 lg:border-r"><div className="max-h-[420px] overflow-y-auto">{items.length === 0 ? <p className="p-5 text-xs text-bhon-muted">Ainda não há conversas. Abra uma para testar a Sarah antes de conectar o WhatsApp Business.</p> : items.map((item) => <button type="button" key={item.id} onClick={() => void open(item.id)} className={`w-full border-b border-bhon-border px-4 py-3 text-left transition-colors hover:bg-white ${selected?.id === item.id ? 'bg-white' : ''}`}><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-bhon-text">{item.contactName || item.patient?.name || item.contactPhone}</strong><span className="shrink-0 text-[10px] text-bhon-teal-dark">{statusLabel[item.status]}</span></span><span className="mt-1 block truncate text-[11px] text-bhon-muted">{item.messages?.[0]?.content || item.lastIntent || item.contactPhone}</span></button>)}</div></aside>
      <div className="flex min-w-0 flex-col">{selected ? <><div className="flex items-center gap-3 border-b border-bhon-border px-5 py-3"><UserRound className="h-4 w-4 text-bhon-teal-dark" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-bhon-text">{selected.contactName || selected.patient?.name || selected.contactPhone}</p><p className="text-[11px] text-bhon-muted">{selected.contactPhone} · {statusLabel[selected.status]}</p></div></div><div className="flex-1 space-y-3 overflow-y-auto bg-white p-5">{selected.messages?.map((item) => <article key={item.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-5 ${item.direction === 'OUTBOUND' ? 'ml-auto bg-bhon-teal-subtle text-bhon-text' : item.direction === 'SYSTEM' ? 'mx-auto border border-bhon-border bg-bhon-bg text-xs text-bhon-muted' : 'bg-bhon-bg text-bhon-text'}`}><p>{item.content}</p>{item.intent ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-bhon-muted">{item.intent.split('_').join(' ')}</p> : null}</article>)}</div><form onSubmit={submit} className="flex gap-2 border-t border-bhon-border p-4"><label className="sr-only" htmlFor="sarah-message">Mensagem recebida</label><input id="sarah-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Simule uma mensagem recebida…" className="min-w-0 flex-1 rounded-xl border border-bhon-border bg-white px-3 text-sm text-bhon-text outline-none focus:border-bhon-teal" /><button disabled={saving || !message.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-bhon-navy text-white disabled:opacity-45" aria-label="Enviar para Sarah"><Send className="h-4 w-4" /></button></form></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageCircleMore className="h-8 w-8 text-bhon-teal" /><p className="mt-3 text-sm font-semibold text-bhon-text">Selecione ou inicie uma conversa</p><p className="mt-1 max-w-sm text-xs leading-5 text-bhon-muted">A Sarah responde às demandas operacionais e registra tudo no histórico da clínica.</p></div>}</div>
    </div>
  </section>;
};
