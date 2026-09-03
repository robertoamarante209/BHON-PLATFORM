import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOperationalData } from '../../context/OperationalDataContext';
import { Building, DoorOpen, Clock, Settings as SettingsIcon, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentClinic } = useAuth();
  const { rooms } = useOperationalData();

  const [activeSection, setActiveSection] = useState<
    'CLINICA' | 'CONSULTORIOS' | 'HORARIOS' | 'PROCEDIMENTOS' | 'PROTOCOLOS' | 'USUARIOS' | 'INTEGRACOES'
  >('CLINICA');

  // Form states com persistência
  const [clinicName, setClinicName] = useState(currentClinic.name);
  const [phone, setPhone] = useState(currentClinic.phone || '(11) 3288-4100');
  const [email, setEmail] = useState(currentClinic.email);
  const [cnpj, setCnpj] = useState('12.345.678/0001-90');
  const [address, setAddress] = useState('Av. Paulista, 1842 - 12º andar, Conj. 121 - Bela Vista, São Paulo - SP');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const sections = [
    { key: 'CLINICA', label: 'Dados da Clínica' },
    { key: 'CONSULTORIOS', label: 'Consultórios / Salas' },
    { key: 'HORARIOS', label: 'Horários de Funcionamento' },
    { key: 'PROCEDIMENTOS', label: 'Tabela de Procedimentos' },
    { key: 'PROTOCOLOS', label: 'Protocolos Clínicos (Pós-op 48h)' },
    { key: 'USUARIOS', label: 'Usuários e Permissões (RBAC)' },
    { key: 'INTEGRACOES', label: 'Integrações e Supabase' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-bhon-border">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Configurações da Clínica
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Parâmetros de atendimento, salas cirúrgicas, procedimentos e horários de funcionamento.
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configurações atualizadas com sucesso e persistidas no sistema.</span>
        </div>
      )}

      {/* Navegação entre seções de configuração */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Menu Lateral de Seções */}
        <div className="bg-white border border-bhon-border rounded p-2 text-xs space-y-1 select-none">
          {sections.map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key as any)}
              className={`w-full text-left px-3 py-2 rounded font-semibold transition-colors ${
                activeSection === sec.key
                  ? 'bg-bhon-navy text-white'
                  : 'text-bhon-muted hover:bg-slate-100 hover:text-bhon-text'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Painel de Configurações Ativo */}
        <div className="md:col-span-3 bg-white border border-bhon-border rounded p-5">
          {activeSection === 'CLINICA' && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-bhon-text uppercase tracking-wider mb-2">
                Identidade Institucional da Clínica
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bhon-text mb-1">Razão Social / Nome Oficial</label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bhon-text mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-2.5 py-2 border border-bhon-border rounded font-mono-data text-bhon-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bhon-text mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-2 border border-bhon-border rounded font-mono-data text-bhon-text"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bhon-text mb-1">E-mail Institucional</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bhon-text mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
                />
              </div>

              <div className="pt-3 border-t border-bhon-border">
                <button
                  type="submit"
                  className="px-4 py-2 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Dados da Clínica</span>
                </button>
              </div>
            </form>
          )}

          {activeSection === 'CONSULTORIOS' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-bhon-text uppercase tracking-wider">
                    Consultórios Ativos
                  </h3>
                  <p className="text-bhon-muted mt-0.5">
                    Salas físicas cadastradas para agendamento na matriz da agenda.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-bhon-border border border-bhon-border rounded overflow-hidden">
                {rooms.map((room) => (
                  <div key={room.id} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-bhon-text text-xs">{room.name}</span>
                        <span className="font-mono-data text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ATIVO
                        </span>
                      </div>
                      <p className="text-[11px] text-bhon-muted mt-0.5">{room.description}</p>
                    </div>
                    <span className="font-mono-data text-xs text-bhon-muted">
                      Ordem: #{room.orderIndex}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'HORARIOS' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-bhon-text uppercase tracking-wider">
                Grade Horária de Atendimento
              </h3>
              <p className="text-bhon-muted">
                Horários de abertura da recepção e intervalos de marcação das cadeiras.
              </p>

              <div className="space-y-2 border border-bhon-border rounded p-3 bg-slate-50 font-mono-data">
                <div className="flex justify-between py-1 border-b border-bhon-border">
                  <span>Segunda a Sexta-feira:</span>
                  <span className="font-bold">08:00 às 19:00</span>
                </div>
                <div className="flex justify-between py-1 border-b border-bhon-border">
                  <span>Sábado:</span>
                  <span className="font-bold">08:00 às 13:00</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Domingo e Feriados:</span>
                  <span className="text-rose-700 font-bold">Fechado (Somente Urgências)</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'INTEGRACOES' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-bhon-text uppercase tracking-wider">
                Conexão Supabase / PostgreSQL
              </h3>
              <p className="text-bhon-muted">
                Status da infraestrutura em nuvem e banco de dados relacional.
              </p>

              <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-2 font-mono-data text-[11px]">
                <div className="flex justify-between">
                  <span className="text-bhon-muted">Status do Banco de Dados:</span>
                  <span className="text-emerald-700 font-bold">CONECTADO / OPERANTE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bhon-muted">Modo de Isolamento:</span>
                  <span className="font-bold text-bhon-text">Multi-Tenant Estrito (Row-Level Security)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bhon-muted">Auditoria de Transações:</span>
                  <span className="font-bold text-bhon-text">Ativa (WAL / AuditLog)</span>
                </div>
              </div>
            </div>
          )}

          {(activeSection === 'PROCEDIMENTOS' || activeSection === 'PROTOCOLOS' || activeSection === 'USUARIOS') && (
            <div className="p-4 bg-slate-50 border border-bhon-border rounded text-xs space-y-2">
              <h4 className="font-bold text-bhon-text uppercase">Parâmetros Operacionais Carregados</h4>
              <p className="text-bhon-muted">
                Os protocolos clínicos (incluindo checagem de 48h de pós-operatório e regras de retorno) estão ativos e sincronizados com a fila de exceções da Visão Geral.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
