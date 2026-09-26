import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, Check, Copy, ExternalLink, FileText, MessageCircle, PackagePlus, PlugZap } from 'lucide-react';
import { useSearch } from 'wouter';
import { useAuth } from '../../context/AuthContext';
import { listFollowUps } from '../../lib/clinic';
import { createDocument, createInventoryItem, listDocuments, listInventory, moveInventory, type ClinicDocument, type InventoryItem } from '../../lib/operations';
import { buildRecoveryWhatsAppDraft } from '../../lib/recovery';
import type { FollowUp } from '../../types';

const canManage = (role: string) => ['OWNER', 'ADMIN', 'MANAGER'].includes(role);
const PageHeader = ({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon: React.ElementType }) => (
  <header className="flex flex-col gap-4 border-b border-bhon-border pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="bhon-eyebrow">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-semibold text-bhon-text">{title}</h1><p className="mt-2 max-w-2xl text-sm text-bhon-muted">{description}</p></div>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bhon-teal/10 text-bhon-teal-dark"><Icon className="h-5 w-5" aria-hidden="true" /></div>
  </header>
);
const Notice = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'error' }) => <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-bhon-border bg-bhon-surface text-bhon-muted'}`}>{children}</div>;

export const WhatsAppPage: React.FC = () => {
  const search = useSearch(); const focusedFollowUpId = new URLSearchParams(search).get('followUp') || undefined;
  const [items, setItems] = useState<FollowUp[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [copiedId, setCopiedId] = useState('');
  const load = () => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void listFollowUps({ status: 'PENDENTE', limit: 50, focus: focusedFollowUpId }, controller.signal)
      .then((result) => setItems(result.data))
      .catch((loadError) => { if (loadError.name !== 'AbortError') setError(loadError.message || 'Não foi possível carregar a fila de contatos.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return controller;
  };
  useEffect(() => { const controller = load(); return () => controller.abort(); }, [focusedFollowUpId]);
  const contactable = useMemo(() => items.filter((item) => item.patientPhone), [items]);
  const copyDraft = async (item: FollowUp) => {
    if (!navigator.clipboard?.writeText) { setError('A cópia não está disponível neste navegador.'); return; }
    try {
      await navigator.clipboard.writeText(buildRecoveryWhatsAppDraft(item));
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId((current) => current === item.id ? '' : current), 1800);
    } catch {
      setError('Não foi possível copiar o rascunho. Tente novamente.');
    }
  };
  return <div className="mx-auto max-w-[1480px] space-y-6"><PageHeader eyebrow="Relacionamento" title={focusedFollowUpId ? 'Rascunho de recuperação' : 'Rascunhos para WhatsApp'} description="Prepare contatos de recuperação com contexto; você revisa e envia pelo canal oficial da clínica." icon={MessageCircle} />
    {error ? <Notice tone="error">{error} <button type="button" onClick={() => load()} className="ml-2 font-bold underline">Tentar novamente</button></Notice> : null}<Notice>A BHON não envia mensagens nem abre conversas nesta etapa. Cada contato é um rascunho copiável, revisado pela equipe antes do envio.</Notice>
    <section className="bhon-panel overflow-hidden rounded-2xl"><div className="border-b border-bhon-border px-5 py-4"><h2 className="font-display text-xl">Fila de contatos</h2><p className="mt-1 text-xs text-bhon-muted">{loading ? 'Atualizando…' : error ? 'Contatos indisponíveis' : `${contactable.length} contatos com telefone disponível`}</p></div>
      <div className="divide-y divide-bhon-border">{loading ? <p className="p-8 text-center text-sm text-bhon-muted">Carregando rascunhos…</p> : !error && contactable.length === 0 ? <p className="p-8 text-center text-sm text-bhon-muted">Nenhum contato pendente com telefone cadastrado.</p> : contactable.map((item) => <article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1.4fr)_auto] lg:items-center"><div><p className="font-semibold text-bhon-text">{item.patientName}</p><p className="mt-1 text-xs text-bhon-muted">{item.reason} · {item.patientPhone}</p></div><p className="rounded-xl border border-bhon-border bg-bhon-bg px-3 py-2 text-xs leading-5 text-bhon-text">{buildRecoveryWhatsAppDraft(item)}</p><button type="button" onClick={() => void copyDraft(item)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-bhon-teal-dark px-4 text-sm font-bold text-bhon-teal-dark transition-colors hover:bg-bhon-teal-dark hover:text-white">{copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copiedId === item.id ? 'Copiado' : 'Copiar rascunho'}</button></article>)}</div>
    </section></div>;
};

export const InventoryPage: React.FC = () => {
  const { currentUser } = useAuth(); const [items, setItems] = useState<InventoryItem[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const reload = () => { setLoading(true); setError(''); void listInventory().then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(reload, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); setError(''); try { await createInventoryItem({ name: String(form.get('name')), sku: String(form.get('sku') || ''), unit: String(form.get('unit') || 'un'), currentStock: Number(form.get('stock') || 0), minimumStock: Number(form.get('minimum') || 0) }); event.currentTarget.reset(); reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao cadastrar item.'); } finally { setSaving(false); } };
  const movement = async (item: InventoryItem, type: 'ENTRY' | 'EXIT') => { const raw = window.prompt(`Quantidade para ${type === 'ENTRY' ? 'entrada' : 'saída'} de ${item.name}:`); if (!raw) return; const quantity = Number(raw.replace(',', '.')); if (!(quantity > 0)) { setError('Informe uma quantidade válida.'); return; } try { await moveInventory(item.id, { type, quantity }); reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao movimentar estoque.'); } };
  return <div className="mx-auto max-w-[1480px] space-y-6"><PageHeader eyebrow="Suprimentos" title="Estoque clínico" description="Saldo real de materiais, mínimos operacionais e movimentações auditadas." icon={Boxes} />{error ? <Notice tone="error">{error}</Notice> : null}
    {canManage(currentUser.role) ? <form onSubmit={submit} className="bhon-panel grid gap-3 rounded-2xl p-5 sm:grid-cols-5"><input name="name" required minLength={2} placeholder="Material" className="rounded-xl border p-3 text-sm sm:col-span-2" /><input name="sku" placeholder="Código" className="rounded-xl border p-3 text-sm" /><input name="unit" placeholder="Unidade" defaultValue="un" className="rounded-xl border p-3 text-sm" /><div className="grid grid-cols-2 gap-2"><input name="stock" type="number" min="0" step="0.001" placeholder="Saldo" className="min-w-0 rounded-xl border p-3 text-sm" /><input name="minimum" type="number" min="0" step="0.001" placeholder="Mínimo" className="min-w-0 rounded-xl border p-3 text-sm" /></div><button disabled={saving} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bhon-teal-dark px-4 text-sm font-bold text-white sm:col-span-5"><PackagePlus className="h-4 w-4" />{saving ? 'Salvando…' : 'Cadastrar material'}</button></form> : null}
    <section className="bhon-panel overflow-hidden rounded-2xl"><div className="overflow-x-auto"><table className="bhon-table"><thead><tr><th>Material</th><th>Código</th><th>Saldo</th><th>Mínimo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{!loading && !error && items.length === 0 ? <tr><td colSpan={6} className="py-10 text-center">Nenhum material cadastrado.</td></tr> : items.map((item) => { const low = Number(item.currentStock) <= Number(item.minimumStock); return <tr key={item.id}><td className="font-semibold">{item.name}</td><td>{item.sku || '—'}</td><td className="font-mono-data">{Number(item.currentStock)} {item.unit}</td><td className="font-mono-data">{Number(item.minimumStock)} {item.unit}</td><td><span className={low ? 'text-amber-800' : 'text-emerald-800'}>{low ? 'Repor' : 'Regular'}</span></td><td>{canManage(currentUser.role) ? <div className="flex gap-2"><button onClick={() => void movement(item, 'ENTRY')} className="min-h-11 rounded-lg border border-bhon-border bg-bhon-bg px-3 py-2 hover:bg-bhon-surface">Entrada</button><button onClick={() => void movement(item, 'EXIT')} className="min-h-11 rounded-lg border border-bhon-border bg-bhon-bg px-3 py-2 hover:bg-bhon-surface">Saída</button></div> : 'Consulta'}</td></tr>; })}</tbody></table></div></section></div>;
};

export const DocumentsPage: React.FC = () => {
  const { currentUser } = useAuth(); const [items, setItems] = useState<ClinicDocument[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const reload = () => { setLoading(true); setError(''); void listDocuments().then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); }; useEffect(reload, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); setError(''); try { await createDocument({ title: String(form.get('title')), category: String(form.get('category')), fileName: String(form.get('fileName')), url: String(form.get('url')) }); event.currentTarget.reset(); reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao cadastrar documento.'); } finally { setSaving(false); } };
  return <div className="mx-auto max-w-[1480px] space-y-6"><PageHeader eyebrow="Informação clínica" title="Documentos" description="Índice seguro de documentos e links externos da clínica, sem arquivos demonstrativos." icon={FileText} />{error ? <Notice tone="error">{error}</Notice> : null}
    {canManage(currentUser.role) ? <form onSubmit={submit} className="bhon-panel grid gap-3 rounded-2xl p-5 sm:grid-cols-2"><input name="title" required placeholder="Título" className="rounded-xl border p-3 text-sm" /><input name="category" required placeholder="Categoria" className="rounded-xl border p-3 text-sm" /><input name="fileName" required placeholder="Nome do arquivo" className="rounded-xl border p-3 text-sm" /><input name="url" required type="url" placeholder="https://…" className="rounded-xl border p-3 text-sm" /><button disabled={saving} className="min-h-11 rounded-xl bg-bhon-teal-dark px-4 text-sm font-bold text-white sm:col-span-2">{saving ? 'Salvando…' : 'Cadastrar documento'}</button></form> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{loading ? <Notice>Carregando documentos…</Notice> : !error && items.length === 0 ? <Notice>Nenhum documento cadastrado.</Notice> : items.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="bhon-panel flex items-start justify-between rounded-2xl p-5 hover:border-bhon-teal-dark"><div><p className="text-xs font-bold uppercase tracking-wider text-bhon-teal-dark">{item.category}</p><h2 className="mt-2 font-semibold text-bhon-text">{item.title}</h2><p className="mt-1 text-xs text-bhon-muted">{item.fileName}</p></div><ExternalLink className="h-4 w-4 text-bhon-muted" /></a>)}</div></div>;
};

export const IntegrationsPage: React.FC = () => (
  <div className="mx-auto max-w-[1480px] space-y-6">
    <PageHeader eyebrow="Ecossistema" title="Integrações" description="Conexões externas da clínica." icon={PlugZap} />
    <Notice>As conexões externas aguardam aprovação. A configuração e a ativação estão indisponíveis nesta fase.</Notice>
    <ul className="divide-y divide-bhon-border rounded-xl border border-bhon-border bg-bhon-surface px-5">
      {['WhatsApp Business', 'Google Agenda', 'Emissão fiscal'].map((name) => (
        <li key={name} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-bhon-text">{name}</h2>
          <span className="text-sm text-bhon-muted">Aguardando aprovação</span>
        </li>
      ))}
    </ul>
    <p className="text-sm text-bhon-muted">Esta área não conecta contas nem sincroniza dados com provedores externos.</p>
  </div>
);
