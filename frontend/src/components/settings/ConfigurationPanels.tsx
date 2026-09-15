import { useEffect, useState } from 'react';
import {
  canManageClinicConfiguration,
  createProtocol,
  getAvailability,
  getAvailabilityProfessionals,
  getProtocols,
  saveAvailability,
  updateProtocol,
  type Availability,
  type Protocol,
  type ProtocolInput,
} from '../../lib/clinicConfiguration';
import type { User } from '../../types';
import { AvailabilityEditor } from './AvailabilityEditor';
import { ProtocolEditor } from './ProtocolEditor';

export function AvailabilitySettingsPanel({ user }: { user: Pick<User, 'role' | 'permissions'> }) {
  const canManage = canManageClinicConfiguration(user);
  const [professionalId, setProfessionalId] = useState('');
  const [professionals, setProfessionals] = useState<Array<{ id: string; name: string }>>([]);
  const [value, setValue] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    void getAvailabilityProfessionals(controller.signal)
      .then(setProfessionals)
      .catch((reason) => { if ((reason as Error).name !== 'AbortError') setError('Não foi possível carregar os profissionais.'); });
    return () => controller.abort();
  }, [canManage]);

  useEffect(() => {
    const controller = new AbortController();
    const requestedScope = professionalId;
    setValue(null); setLoading(true); setError('');
    void getAvailability(professionalId || undefined, controller.signal)
      .then((result) => { if (!controller.signal.aborted && requestedScope === professionalId) setValue(result); })
      .catch((reason) => { if ((reason as Error).name !== 'AbortError') setError((reason as Error).message || 'Não foi possível carregar a disponibilidade.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [professionalId]);

  if (loading) return <p className="text-sm text-bhon-muted" aria-live="polite">Carregando disponibilidade…</p>;
  return <div className="space-y-5">
    <div><h2 className="font-display text-xl text-bhon-navy">Disponibilidade semanal</h2><p className="mt-1 text-sm text-bhon-muted">Registro informativo da semana. Os intervalos não bloqueiam a agenda.</p></div>
    {canManage ? <label className="block max-w-md text-xs font-bold text-bhon-text">Escopo
      <select aria-label="Escopo da disponibilidade" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 text-sm text-bhon-text">
        <option value="">Clínica inteira</option>
        {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
      </select>
    </label> : null}
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
    {!error ? <AvailabilityEditor value={value && { ...value, professionalId: professionalId || null }} canManage={canManage} onSave={async (draft) => setValue(await saveAvailability({ ...draft, professionalId: professionalId || null }))} /> : null}
  </div>;
}

export function ProtocolSettingsPanel({ user }: { user: Pick<User, 'role' | 'permissions'> }) {
  const canManage = canManageClinicConfiguration(user);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try { setProtocols(await getProtocols(signal)); }
    catch (reason) { if ((reason as Error).name !== 'AbortError') setError((reason as Error).message || 'Não foi possível carregar os protocolos.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  };
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, []);
  if (loading) return <p className="text-sm text-bhon-muted" aria-live="polite">Carregando protocolos…</p>;
  return <div className="space-y-5">
    <div><h2 className="font-display text-xl text-bhon-navy">Protocolos da clínica</h2><p className="mt-1 text-sm text-bhon-muted">Modelos definidos pela equipe. A BHON não gera instruções clínicas.</p></div>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
    <ProtocolEditor protocols={protocols} canManage={canManage} onSave={async (input: ProtocolInput, id?: string) => {
      const saved = id ? await updateProtocol(id, input) : await createProtocol(input);
      setProtocols((current) => id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
    }} />
  </div>;
}
