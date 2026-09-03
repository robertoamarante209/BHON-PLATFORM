import React, { useState } from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { Sliders, Shield, Save, CheckCircle2, Database, Key } from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  const { auditLogs } = useOperationalData();
  const [activeTab, setActiveTab] = useState<'PARAMETROS' | 'GATEWAYS' | 'HEALTH' | 'AUDIT'>('PARAMETROS');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Parâmetros Globais da Plataforma BHON
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurações de infraestrutura, gateways de pagamento e auditoria transversal do sistema.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs rounded font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Configurações globais salvas com sucesso.</span>
        </div>
      )}

      {/* Navegação entre Seções */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded p-2 text-xs space-y-1 select-none">
          {[
            { key: 'PARAMETROS', label: 'Parâmetros Gerais' },
            { key: 'GATEWAYS', label: 'Gateways de Pagamento (Asaas/Stripe)' },
            { key: 'HEALTH', label: 'Saúde dos Clusters & Backups' },
            { key: 'AUDIT', label: 'Trilha de Auditoria Global' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`w-full text-left px-3 py-2 rounded font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="md:col-span-3 bg-slate-950 border border-slate-800 rounded p-5">
          {activeTab === 'PARAMETROS' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-2">
                Parâmetros da Plataforma
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome da Plataforma</label>
                  <input
                    type="text"
                    defaultValue="BHON Clinical Operating System"
                    className="w-full px-2.5 py-2 border border-slate-800 bg-slate-900 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Slogan Institucional</label>
                  <input
                    type="text"
                    defaultValue="A clínica no controle."
                    className="w-full px-2.5 py-2 border border-slate-800 bg-slate-900 rounded text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Dias de Trial Padrão</label>
                  <input
                    type="number"
                    defaultValue={14}
                    className="w-full px-2.5 py-2 border border-slate-800 bg-slate-900 rounded text-slate-200 font-mono-data"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prazo de Bloqueio por Inadimplência</label>
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-full px-2.5 py-2 border border-slate-800 bg-slate-900 rounded text-slate-200 font-mono-data"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded uppercase tracking-wider text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Parâmetros Globais</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'GATEWAYS' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Gateways de Cobrança Integrados
              </h3>
              <p className="text-slate-400">
                Configuração das credenciais para emissão de boletos, Pix e cartão recorrente das assinaturas BHON.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Asaas (Cobrança Nacional Pix/Boleto)</span>
                    <span className="font-mono-data text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ATIVO
                    </span>
                  </div>
                  <p className="font-mono-data text-slate-400 text-[11px] mt-1">
                    Chave de API: $env:ASAAS_API_KEY (configurada)
                  </p>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Stripe (Cartão Recorrente Internacional)</span>
                    <span className="font-mono-data text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ATIVO
                    </span>
                  </div>
                  <p className="font-mono-data text-slate-400 text-[11px] mt-1">
                    Webhook: https://api.bhon.com.br/webhooks/stripe
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HEALTH' && (
            <div className="space-y-4 text-xs font-mono-data">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider font-sans">
                Saúde dos Clusters e Rotinas de Backup
              </h3>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco de Dados Relacional:</span>
                  <span className="text-emerald-400 font-bold">OPERACIONAL (PostgreSQL 16)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Último Backup Automático:</span>
                  <span className="text-white">Hoje às 03:00 (Completo / Retenção 30 dias)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Replicação em Tempo Real:</span>
                  <span className="text-emerald-400 font-bold">ATIVA (Multi-AZ)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AUDIT' && (
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Trilha de Auditoria Transversal
              </h3>
              <p className="text-slate-400">
                Log permanente de eventos críticos disparados por operadores e clínicas parceiras.
              </p>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded overflow-hidden">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-900/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data font-bold text-amber-400 text-[11px]">
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-mono-data text-[10px]">
                          {log.resource} #{log.resourceId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Operador: <strong className="text-white">{log.actorUserName}</strong>
                      </p>
                    </div>
                    <span className="font-mono-data text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
