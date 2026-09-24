import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, CalendarDays, Users, ClipboardList, UserRoundCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { PublicShell } from '../../components/public/PublicShell';
import { PublicReveal } from '../../components/public/PublicReveal';
import { DashboardMobilePreview } from '../../components/public/DashboardMobilePreview';
import { PricingCards } from '../../components/public/PricingCards';
import { PublicFaq } from '../../components/public/PublicFaq';

const pillars = [
  { icon: CalendarDays, title: 'Uma agenda que a equipe entende.', text: 'Horários, profissionais e status de atendimento organizados para acompanhar o dia e ajustar a rotina.' },
  { icon: Users, title: 'O histórico acompanha o paciente.', text: 'Cadastro, atendimentos e informações reunidos para sua equipe continuar a conversa com contexto.' },
  { icon: ClipboardList, title: 'Orçamentos com próximo passo.', text: 'Saiba o que está em aberto, quem está acompanhando e quando vale retomar o contato.' },
  { icon: UserRoundCheck, title: 'Cada pessoa sabe onde atuar.', text: 'Acessos individuais e permissões por função. Mais autonomia para trabalhar, mais clareza para gerir.' },
];
function Hero() {
  const reduced = useReducedMotion();
  return <section className="public-hero">
    <div className="public-hero-grid" aria-hidden="true" />
    <motion.div className="public-orbit" aria-hidden="true" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}><i /><i /><i /></motion.div>
    <div className="public-container public-hero-content">
      <div className="public-hero-top"><span className="public-kicker"><i className="public-live-dot" /> GESTÃO PARA CLÍNICAS DE TODAS AS ESPECIALIDADES</span><span className="public-hero-index">BHON / 001</span></div>
      <h1 aria-label="A clínica no controle.">{['A clínica', 'no controle.'].map((line, index) => <span key={line} className="public-title-line"><motion.span className={index ? 'public-outline-text' : ''} initial={reduced ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}>{line}</motion.span></span>)}</h1>
      <div className="public-hero-bottom"><p>Da primeira consulta ao retorno que estava faltando.<br className="public-desktop-break" /> Agenda, pacientes e oportunidades no mesmo lugar.</p><div><a className="public-button" href="/comece">Começar teste grátis <ArrowUpRight size={19} /></a><small>14 dias para testar na sua rotina.</small></div></div>
      <a className="public-explore" href="#produto"><span>CONHEÇA A BHON</span><ArrowDown size={16} /></a>
    </div>
  </section>;
}
export function BhonLandingPage() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const scrollToTarget = () => {
      const target = document.getElementById(decodeURIComponent(hash));
      target?.scrollIntoView({ behavior: 'auto', block: 'start' });
    };

    scrollToTarget();
    const timer = window.setTimeout(scrollToTarget, 700);
    void document.fonts?.ready.then(scrollToTarget);
    window.addEventListener('load', scrollToTarget, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('load', scrollToTarget);
    };
  }, []);

  return <PublicShell>
    <Hero />
    <div className="public-marquee" aria-hidden="true"><div>{[0,1].map(n => <span key={n}>AGENDA <b>↗</b> PACIENTES <b>↗</b> EQUIPE <b>↗</b> RECUPERAÇÃO <b>↗</b> A CLÍNICA NO CONTROLE <b>↗</b> </span>)}</div></div>
    <section id="produto" className="public-section public-product"><div className="public-container">
      <PublicReveal><p className="public-kicker">01 / A ROTINA MERECE MAIS CLAREZA</p><div className="public-section-heading"><h2>Seu dia já é cheio.<br /><span>A gestão pode ser simples.</span></h2><p>Entre um atendimento e outro, a clínica precisa continuar funcionando. A BHON aproxima as informações de quem precisa agir.</p></div></PublicReveal>
      <div className="public-pillars">{pillars.map(({ icon: Icon, title, text }, i) => <PublicReveal key={title} delay={i * 0.06} className="public-pillar"><div><span>0{i+1}</span><Icon size={22} /></div><h3>{title}</h3><p>{text}</p></PublicReveal>)}</div>
    </div></section>
    <section className="public-section public-immersion"><div className="public-container public-immersion-grid"><PublicReveal><p className="public-kicker">02 / A CLÍNICA VAI COM VOCÊ</p><h2>O dia continua.<br /><span>Você acompanha.</span></h2><p className="public-body">Na recepção, entre consultas ou fora da clínica. Consulte o que está acontecendo pelo celular, com as informações que ajudam a decidir o próximo passo.</p><div className="public-feature-lines"><p><CalendarDays size={19} /> A agenda e os atendimentos do dia</p><p><Sparkles size={19} /> Orçamentos que merecem uma nova conversa</p><p><Users size={19} /> A equipe trabalhando com o mesmo contexto</p></div><a className="public-text-link" href="/comece">Conhecer por dentro <ArrowUpRight size={19} /></a></PublicReveal><PublicReveal className="public-phone-stage"><span className="public-phone-orbit" aria-hidden="true" /><DashboardMobilePreview /></PublicReveal></div></section>
    <section className="public-section public-recovery"><div className="public-container public-recovery-grid"><PublicReveal><p className="public-kicker">CADA CONVERSA TEM CONTINUIDADE</p><h2>Um orçamento parado<br />não precisa virar<br /><span>uma oportunidade esquecida.</span></h2><p className="public-body">Às vezes, falta esclarecer uma dúvida. Em outras, encontrar um horário melhor. A BHON ajuda sua equipe a lembrar quem precisa de atenção e registrar o próximo contato.</p><a href="#planos" className="public-text-link">Trazer essa rotina para a clínica <ArrowUpRight size={18} /></a></PublicReveal><PublicReveal className="public-recovery-card"><div><span className="public-kicker">ACOMPANHAMENTO</span><Sparkles size={19} /></div><h3>A conversa continua por aqui.</h3><ol>{[['Orçamento apresentado','A oportunidade fica registrada.'],['Contato planejado','Responsável e próximo passo definidos.'],['Retomada com contexto','Sua equipe conversa com atenção.']].map(([title,text],i)=><li key={title}><span>0{i+1}</span><div><strong>{title}</strong><p>{text}</p></div><span className="public-check">✓</span></li>)}</ol><p className="public-card-note">Acompanhamento humano. Histórico organizado.</p></PublicReveal></div></section>
    <section id="como-funciona" className="public-section public-process"><div className="public-container"><PublicReveal><p className="public-kicker">03 / COMECE PELO QUE IMPORTA</p><h2>Conheça na prática.<br /><span>Decida com calma.</span></h2></PublicReveal><div className="public-process-grid">{[
      ['01', 'Cadastre sua clínica.', 'Escolha o plano, crie seu acesso e confirme os dados da assinatura no checkout seguro.'],
      ['02', 'Traga sua rotina.', 'Cadastre a equipe, organize a agenda e importe os pacientes com revisão dos dados.'],
      ['03', 'Experimente por 14 dias.', 'Avalie a BHON no dia a dia. Se não fizer sentido, solicite o cancelamento antes da primeira cobrança.']
    ].map(([number,title,text],i)=><PublicReveal key={number} delay={i*.08}><span className="public-process-number">{number}</span><h3>{title}</h3><p>{text}</p></PublicReveal>)}</div></div></section>
    <PricingCards />
    <section id="seguranca" className="public-security"><div className="public-container"><ShieldCheck size={32}/><div><h2>Cuidado também é responsabilidade.</h2><p>Acessos por função, informações organizadas por clínica e pagamento pelo checkout da Stripe. Conheça nossas práticas na <a href="/privacidade">política de privacidade</a>.</p></div></div></section>
    <PublicFaq />
    <section className="public-final-cta public-container"><PublicReveal><p className="public-kicker">A PRÓXIMA FASE DA SUA CLÍNICA</p><h2>Mais clareza para gerir.<br /><span>Mais espaço para cuidar.</span></h2><a href="/comece" className="public-button">Começar teste grátis <ArrowUpRight size={20}/></a></PublicReveal></section>
  </PublicShell>;
}
