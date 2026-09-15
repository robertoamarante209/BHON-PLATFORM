import { useEffect, useState } from 'react';
import type { Availability, AvailabilityInterval } from '../../lib/clinicConfiguration';

const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export function AvailabilityEditor({ value, canManage, onSave }: { value: Availability | null; canManage: boolean; onSave: (value: Availability) => Promise<void> }) {
  const [draft, setDraft] = useState<Availability | null>(value); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => setDraft(value), [value]);
  if (!draft) return <div className="space-y-3"><p className="text-sm text-bhon-muted">Disponibilidade ainda não configurada.</p>{canManage && <button className="rounded-xl bg-bhon-navy px-4 py-2 text-sm font-bold text-white" onClick={() => setDraft({ professionalId: null, intervals: [], version: 0 })}>Configurar semana</button>}</div>;
  const add = () => setDraft({ ...draft, intervals: [...draft.intervals, { dayOfWeek: 1, start: '08:00', end: '12:00' }] });
  const update = (index: number, patch: Partial<AvailabilityInterval>) => setDraft({ ...draft, intervals: draft.intervals.map((item, at) => at === index ? { ...item, ...patch } : item) });
  return <div className="space-y-4">{draft.intervals.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-bhon-muted">Semana fechada explicitamente.</p>}{draft.intervals.map((item, index) => <div key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
    <label className="text-xs font-bold">Dia<select aria-label={`Dia ${index + 1}`} value={item.dayOfWeek} onChange={event => update(index, { dayOfWeek: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border p-2">{days.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select></label>
    <label className="text-xs font-bold">Início<input aria-label={`Início ${index + 1}`} type="time" value={item.start} onChange={event => update(index, { start: event.target.value })} className="mt-1 block w-full rounded-lg border p-2" /></label>
    <label className="text-xs font-bold">Fim<input aria-label={`Fim ${index + 1}`} type="time" value={item.end} onChange={event => update(index, { end: event.target.value })} className="mt-1 block w-full rounded-lg border p-2" /></label>
    {canManage && <button aria-label={`Remover intervalo ${index + 1}`} onClick={() => setDraft({ ...draft, intervals: draft.intervals.filter((_, at) => at !== index) })}>Remover</button>}
  </div>)}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{canManage && <div className="flex gap-2"><button onClick={add} className="rounded-xl border px-4 py-2 text-sm font-bold">Adicionar intervalo</button><button disabled={saving} onClick={async () => { setSaving(true); setError(''); try { await onSave(draft); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } }} className="rounded-xl bg-bhon-teal px-4 py-2 text-sm font-bold text-white">{saving ? 'Salvando…' : 'Salvar disponibilidade'}</button></div>}</div>;
}
