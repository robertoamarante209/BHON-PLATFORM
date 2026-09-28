import React, { useState } from 'react';
import { CalendarDays, LayoutDashboard, Users, Sparkles, Menu, ChevronRight, Bell, Check, Signal, Wifi, BatteryFull } from 'lucide-react';

export function DashboardMobilePreview() {
  const [tab, setTab] = useState<'overview' | 'agenda'>('overview');
  return <figure className="public-phone-figure" aria-label="Prévia do painel móvel da BHON">
    <div className="public-phone">
      <div className="phone-status" aria-hidden="true"><b>9:41</b><span className="phone-island" /><span><Signal size={13} /><Wifi size={13} /><BatteryFull size={16} /></span></div>
      <div className="phone-toolbar"><Menu size={17} /><span>Clínica demonstração</span><Bell size={17} /></div>
      <div className="phone-content">
        <p className="phone-eyebrow">QUARTA-FEIRA, 16 DE SETEMBRO</p>
        <h3>{tab === 'overview' ? 'Bom dia.' : 'Agenda clínica'}</h3>
        <p className="phone-subtitle">{tab === 'overview' ? 'Sua operação de hoje, em um só lugar.' : 'Cada atendimento, no seu tempo.'}</p>
        <div className="phone-summary"><div><CalendarDays size={17} /><strong>08</strong><span>Agendados</span></div><div><Users size={17} /><strong>02</strong><span>Aguardando</span></div><div><Check size={17} /><strong>03</strong><span>Concluídos</span></div></div>
        <div className="phone-section-title"><h4>{tab === 'overview' ? 'Próximos atendimentos' : 'Agenda do dia'}</h4><span>HOJE</span></div>
        <div className="phone-appointments">{[['09:30', 'Paciente A', 'Consulta · Sala 01', 'Confirmado', 'teal'], ['10:00', 'Paciente B', 'Retorno · Sala 02', 'Na recepção', 'blue'], ['10:30', 'Paciente C', 'Avaliação · Sala 01', 'A confirmar', 'amber']].map(([time, name, detail, status, tone]) => <div className={'phone-appointment ' + tone} key={time}><time>{time}</time><div><strong>{name}</strong><span>{detail}</span><em>{status}</em></div><ChevronRight size={14} /></div>)}</div>
        {tab === 'overview' ? <div className="phone-recovery"><span><Sparkles size={15} /> Recuperar orçamentos</span><strong>A conversa pode continuar.</strong><p>3 acompanhamentos para hoje</p><div><span>Ver oportunidades</span><ChevronRight size={15} /></div></div> : <div className="phone-free-slot"><time>11:00</time><span>Horário disponível</span></div>}
      </div>
      <nav className="phone-tabs" aria-label="Explorar prévia do dashboard"><button aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}><LayoutDashboard size={18} />Visão geral</button><button aria-pressed={tab === 'agenda'} onClick={() => setTab('agenda')}><CalendarDays size={18} />Agenda</button></nav>
      <div className="phone-home-bar" aria-hidden="true" />
    </div>
    <figcaption>Prévia ilustrativa · dados fictícios<br /><span>Toque nas abas para explorar.</span></figcaption>
  </figure>;
}

