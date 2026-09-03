import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Building, ArrowLeft, ShieldCheck, DollarSign, Users, Calendar, LifeBuoy, CheckCircle2 } from 'lucide-react';

export const PlatformClinicDetailPage: React.FC = () => {
  const [, params] = useRoute('/platform/clinics/:id');
  const [, setLocation] = useLocation();
  const { platformClinics, platformInvoices, supportTickets, appointments, patients, treatments } = useOperationalData();

  const clinicId = params?.id;
  const clinic = platformClinics.find((c) => c.id === clinicId);

  if (!clinic) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        <p className="text-sm font-bold text-white">Clínica não localizada</p>
        <button
          onClick={() => setLocation('/platform/clinics')}
          className="mt-4 px-3 py-1.5 bg-slate-800 text-white rounded font-semibold"
        >
          Voltar para Clínicas
        </button>
      </div>
    );
  }

  const invoices = platformInvoices.filter((i) => i.clinicId === clinic.id);
  const tickets = supportTickets.filter((t) => t.clinicId === clinic.id);

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-slate-100">
      {/* Botão de Retorno */}
      <div>
        <button
          onClick={() => setLocation('/platform/clinics')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Gestão de Clínicas</span>
        </button>
      </div>

      {/* Cartão de Identidade da Clínica no Mantenedor */}
      <div className="bg-slate-950 border border-slate-800 rounded p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center font-bold text-lg">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-white">{clinic.name}</h1>
                <StatusBadge status={clinic.status} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Responsável: <strong className="text-slate-200">{clinic.ownerName}</strong> ({clinic.ownerEmail})
              </p>
              <div className="flex items-center gap-4 text-xs font-mono-data text-slate-400 mt-2">
                <span>Plano: <strong className="text-amber-400">{clinic.planName}</strong></span>
                <span>•</span>
                <span>MRR: <strong className="text-amber-400">R$ {clinic.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                <span>•</span>
                <span>Entrada: {new Date(clinic.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs font-mono-data text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Acesso Auditado</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Operação de plataforma com trilha de auditoria (LGPD & Tenancy).
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas de Utilização da Clínica */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Pacientes Cadastrados</span>
          <div className="font-mono-data text-xl font-bold text-white">{clinic.patientsCount}</div>
        </div>
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Usuários com Acesso</span>
          <div className="font-mono-data text-xl font-bold text-white">{clinic.usersCount}</div>
        </div>
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Faturas BHON Geradas</span>
          <div className="font-mono-data text-xl font-bold text-white">{invoices.length}</div>
        </div>
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Chamados de Suporte</span>
          <div className="font-mono-data text-xl font-bold text-white">{tickets.length}</div>
        </div>
      </div>

      {/* Histórico de Faturamento BHON desta Clínica */}
      <div className="bg-slate-950 border border-slate-800 rounded p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Histórico de Faturas da Assinatura BHON
        </h3>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhuma fatura emitida no histórico recente.</p>
        ) : (
          <div className="divide-y divide-slate-800 border border-slate-800 rounded overflow-hidden">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-3 bg-slate-900/60 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data font-bold text-white">{inv.invoiceNumber}</span>
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vencimento: {inv.dueDate} • Método: {inv.paymentMethod}
                  </p>
                </div>
                <div className="font-mono-data font-bold text-amber-400 text-sm">
                  R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Suporte */}
      <div className="bg-slate-950 border border-slate-800 rounded p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Chamados e Interações de Suporte Técnico
        </h3>
        {tickets.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum chamado aberto pela clínica.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{t.title}</span>
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <p className="text-slate-400 text-[11px] mt-1">{t.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
