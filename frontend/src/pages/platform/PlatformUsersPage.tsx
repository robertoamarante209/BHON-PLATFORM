import React, { useState } from 'react';
import { initialUsers, initialClinics } from '../../data/initialData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, Users2, Shield } from 'lucide-react';

export const PlatformUsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const usersWithClinic = initialUsers.map((u) => {
    const clinic = initialClinics.find((c) => c.id === u.tenantId);
    return {
      ...u,
      clinicName: clinic ? clinic.name : (u.role === 'PLATFORM_OWNER' ? 'BHON Platform Global' : 'Clínica Geral'),
    };
  });

  const filteredUsers = usersWithClinic.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.clinicName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Usuários Globais do Sistema
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle de contas ativas, papéis e acessos multi-clínica com auditoria estrita.
          </p>
        </div>
        <span className="font-mono-data text-xs text-slate-400">
          {initialUsers.length} usuários registrados
        </span>
      </div>

      {/* Barra de Busca */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, e-mail ou clínica..."
          className="w-full pl-9 pr-3 py-1.5 border border-slate-800 bg-slate-950 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Tabela Mandatória do Master Prompt (Seção 34):
          Name, Email, Clinic, Role, Status, Last access, Created at */}
      <div className="bg-slate-950 border border-slate-800 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono-data">
                <th className="p-3">Nome</th>
                <th className="p-3">E-mail Institucional</th>
                <th className="p-3">Clínica Vinculada</th>
                <th className="p-3">Papel (RBAC)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Último Acesso</th>
                <th className="p-3">Criado Em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="p-3 font-bold text-white whitespace-nowrap">
                    {user.name}
                  </td>
                  <td className="p-3 font-mono-data text-slate-300 whitespace-nowrap">
                    {user.email}
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {user.clinicName}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-mono-data text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-200 font-semibold">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={user.status} size="sm" />
                  </td>
                  <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                    Há 12 minutos
                  </td>
                  <td className="p-3 font-mono-data text-slate-500 whitespace-nowrap">
                    2024-03-15
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
