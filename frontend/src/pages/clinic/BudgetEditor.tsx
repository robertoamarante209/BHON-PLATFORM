import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Drawer } from '../../components/common/Drawer';
import { createBudget, listPatients } from '../../lib/clinic';
import type { Patient } from '../../types';

type DraftItem = { description: string; quantity: string; unitPrice: string };
const blankItem = (): DraftItem => ({ description: '', quantity: '1', unitPrice: '' });
const cents = (value: string) => Math.round((Number(value.replace(',', '.')) || 0) * 100);
const money = (value: number) => `R$ ${(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BudgetEditor({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  const [search, setSearch] = useState(''); const [patients, setPatients] = useState<Patient[]>([]); const [patient, setPatient] = useState<Patient | null>(null);
  const [title, setTitle] = useState('Plano clínico'); const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [discount, setDiscount] = useState(''); const [paymentMethod, setPaymentMethod] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!open || patient || search.trim().length < 2) { setPatients([]); return; } const controller = new AbortController(); const timer = window.setTimeout(() => void listPatients({ search: search.trim(), status: 'ACTIVE', limit: 10 }, controller.signal).then((result) => setPatients(result.data)).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); }), 200); return () => { window.clearTimeout(timer); controller.abort(); }; }, [open, patient, search]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.round(cents(item.unitPrice) * (Number(item.quantity.replace(',', '.')) || 0)), 0), [items]);
  const total = Math.max(0, subtotal - cents(discount));
  const updateItem = (index: number, field: keyof DraftItem, value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (saving) return; if (!patient) { setError('Selecione um paciente.'); return; } if (items.some((item) => !item.description.trim() || !(Number(item.quantity.replace(',', '.')) > 0))) { setError('Revise os itens do orçamento.'); return; } if (cents(discount) > subtotal) { setError('O desconto não pode ser maior que o subtotal.'); return; } setSaving(true); setError(''); try { const result = await createBudget({ patientId: patient.id, title: title.trim() || 'Plano clínico', items: items.map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity.replace(',', '.')), unitPrice: Number(item.unitPrice.replace(',', '.')) })), discountAmount: discount ? Number(discount.replace(',', '.')) : undefined, paymentMethod: paymentMethod.trim() || undefined }); onSaved(result.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o orçamento.'); } finally { setSaving(false); } };
  return <Drawer isOpen={open} onClose={() => !saving && onClose()} title="Novo orçamento" subtitle="Valores confirmados pelo servidor" width="max-w-2xl"><form onSubmit={submit} className="space-y-4">
    {error && <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-rose-900">{error}</div>}
    <label className="block space-y-1"><span className="font-bold">Buscar paciente</span><input aria-label="Buscar paciente" value={patient ? `${patient.name} (${patient.recordNumber})` : search} onChange={(event) => { setPatient(null); setSearch(event.target.value); }} className="w-full rounded border border-bhon-border p-2" placeholder="Nome ou prontuário" /></label>
    {!patient && patients.length > 0 && <div className="rounded border border-bhon-border">{patients.map((item) => <button key={item.id} type="button" onClick={() => { setPatient(item); setPatients([]); }} className="block w-full border-b border-bhon-border p-2 text-left last:border-0">{item.name} · {item.recordNumber}</button>)}</div>}
    <label className="block space-y-1"><span className="font-bold">Título</span><input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="w-full rounded border border-bhon-border p-2" /></label>
    <fieldset className="space-y-3"><legend className="font-bold">Itens</legend>{items.map((item, index) => <div key={index} className="grid gap-2 rounded border border-bhon-border p-3 sm:grid-cols-[1fr_7rem_9rem_auto]">
      <input aria-label={`Descrição do item ${index + 1}`} required value={item.description} maxLength={200} onChange={(event) => updateItem(index, 'description', event.target.value)} placeholder="Descrição" className="w-full rounded border p-2" />
      <input aria-label={`Quantidade do item ${index + 1}`} required type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} className="w-full rounded border p-2" />
      <input aria-label={`Valor unitário do item ${index + 1}`} required type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} placeholder="R$ 0,00" className="w-full rounded border p-2" />
      <button type="button" aria-label={`Remover item ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded border p-2 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
    </div>)}</fieldset>
    <button type="button" disabled={items.length >= 50} onClick={() => setItems((current) => [...current, blankItem()])} className="flex items-center gap-1 rounded border border-bhon-border px-3 py-2 font-bold"><Plus className="h-4 w-4" /> Adicionar item</button>
    <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="font-bold">Desconto</span><input aria-label="Desconto" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="w-full rounded border p-2" /></label><label className="space-y-1"><span className="font-bold">Condição de pagamento</span><input value={paymentMethod} maxLength={120} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded border p-2" placeholder="Ex.: PIX ou 3 parcelas" /></label></div>
    <div className="rounded bg-slate-50 p-3"><div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="mt-1 flex justify-between text-sm"><span>Total</span><strong>{money(total)}</strong></div></div>
    <button type="submit" disabled={saving} className="w-full rounded bg-bhon-teal py-3 font-bold text-bhon-navy disabled:opacity-60">{saving ? 'Salvando…' : 'Salvar orçamento'}</button>
  </form></Drawer>;
}
