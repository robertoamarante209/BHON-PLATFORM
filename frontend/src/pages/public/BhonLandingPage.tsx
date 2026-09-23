import React from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, HeartPulse, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

const proof = [
  { icon: CalendarDays, title: 'Agenda com contexto', text: 'Cada atendimento, profissional e retorno no lugar certo.' },
  { icon: UsersRound, title: 'Equipe alinhada', text: 'Permissões claras, rotina compartilhada e menos retrabalho.' },
  { icon: HeartPulse, title: 'Relacionamento ativo', text: 'Recupere oportunidades com uma operação que não deixa pessoas para trás.' },
];

const plans = [
  { cycle: 'Mensal', price: 'R$ 290', cadence: '/ mês', detail: 'Para começar com flexibilidade.', featured: false },
  { cycle: 'Anual', price: 'R$ 2.900', cadence: '/ ano', detail: 'Pague 10 meses e use 12. Economia de R$ 580.', featured: true },
];

export const BhonLandingPage: React.FC = () => (
  <main className="min-h-screen overflow-hidden bg-[#0b1211] text-[#f3f7f5] selection:bg-[#16c4a4] selection:text-[#07100e]">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_66%_0%,rgba(27,211,174,0.18),transparent_34%),radial-gradient(circle_at_10%_22%,rgba(103,153,143,0.12),transparent_30%)]" />
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <a href="/" className="flex items-center" aria-label="BHON, página inicial"><img src="/logo-bhon-dark.svg" alt="BHON" className="h-9 w-auto" /></a>
      <nav className="hidden items-center gap-7 text-sm text-[#b8c9c3] md:flex" aria-label="Navegação principal">
        <a className="transition hover:text-white" href="#produto">Produto</a><a className="transition hover:text-white" href="#planos">Planos</a><a className="transition hover:text-white" href="#seguranca">Segurança</a>
      </nav>
      <div className="flex items-center gap-4"><a href="/login" className="hidden text-sm font-medium text-[#d8e5e0] transition hover:text-white sm:block">Entrar</a><a href="/comece" className="rounded-full bg-[#d9f7ef] px-4 py-2.5 text-sm font-semibold text-[#0b1714] transition hover:-translate-y-0.5 hover:bg-white">Começar teste</a></div>
    </header>

    <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-36 lg:pt-28">
      <div className="max-w-3xl">
        <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-[#9be7d6] uppercase"><Sparkles size={14} /> Operação clínica inteligente</p>
        <h1 className="max-w-3xl font-display text-5xl font-medium leading-[.98] tracking-[-0.055em] text-[#f6faf8] sm:text-6xl lg:text-7xl">A clínica no controle.<span className="text-[#7dffdf]"> Sem ruído.</span></h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-[#adc0ba]">A BHON reúne agenda, pacientes, equipe e oportunidades em uma operação simples de acompanhar — para sua clínica cuidar melhor do tempo e das pessoas.</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"><a href="/comece" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#1bd3ae] px-6 py-3.5 font-semibold text-[#06231d] transition hover:-translate-y-0.5 hover:bg-[#82f2d9]">Começar teste grátis <ArrowRight size={18} className="transition group-hover:translate-x-1" /></a><span className="inline-flex items-center gap-2 text-sm text-[#9cafaa]"><Clock3 size={16} className="text-[#50cbb1]" />14 dias para testar. Cancele quando quiser.</span></div>
      </div>
      <div className="relative flex items-end justify-center lg:justify-end">
        <div className="w-full max-w-[500px] rounded-[2rem] border border-white/10 bg-[#111d1a]/85 p-4 shadow-[0_35px_100px_rgba(0,0,0,.42)] backdrop-blur-xl">
          <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#132421] p-6 sm:p-8"><div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-[.16em] text-[#86a79e] uppercase">Visão do dia</span><span className="h-2.5 w-2.5 rounded-full bg-[#1bd3ae] shadow-[0_0_0_5px_rgba(27,211,174,.12)]" /></div><h2 className="mt-5 text-2xl font-medium tracking-[-.03em]">Sua operação, em movimento.</h2><div className="mt-7 grid grid-cols-3 gap-3">{[['08','atendimentos'],['03','retornos'],['01','prioridade']].map(([number,label]) => <div key={label} className="rounded-2xl border border-white/[.08] bg-[#0c1715] p-3"><p className="text-xl font-semibold text-[#dffcf4]">{number}</p><p className="mt-1 text-[10px] leading-4 text-[#8ca9a1]">{label}</p></div>)}</div><div className="mt-5 space-y-3">{['Confirmações que precisam de atenção', 'Pacientes para retomar', 'Agenda organizada para a equipe'].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[.045] px-4 py-3 text-sm text-[#c4d5d0]"><span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-[#f5bc70]' : 'bg-[#31ba9d]'}`} />{item}</div>)}</div></div>
        </div>
      </div>
    </section>

    <section id="produto" className="border-y border-white/[.08] bg-[#eaf2ef] px-6 py-20 text-[#0e1c19] lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold tracking-[.17em] text-[#307b69] uppercase">Feito para a rotina real</p><div className="mt-5 flex flex-col justify-between gap-6 md:flex-row"><h2 className="max-w-2xl font-display text-4xl leading-tight tracking-[-.045em] sm:text-5xl">Menos abas. Mais clareza para decidir o próximo passo.</h2><p className="max-w-sm text-base leading-7 text-[#597068]">Não é um painel de números. É uma base de operação para a clínica trabalhar com presença.</p></div><div className="mt-14 grid gap-4 md:grid-cols-3">{proof.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-[#d5e1dd] bg-[#f8fbfa] p-7"><Icon size={24} className="text-[#168a71]" /><h3 className="mt-9 text-xl font-semibold tracking-[-.025em]">{title}</h3><p className="mt-3 leading-7 text-[#60766e]">{text}</p></article>)}</div></div></section>

    <section id="planos" className="px-6 py-24 lg:px-10"><div className="mx-auto max-w-5xl text-center"><p className="text-xs font-bold tracking-[.17em] text-[#78e2cc] uppercase">Planos transparentes</p><h2 className="mt-5 font-display text-4xl tracking-[-.05em] sm:text-5xl">Comece no seu ritmo.</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-[#aabeb7]">O mesmo produto BHON. Você escolhe como prefere contratar.</p><div className="mt-12 grid gap-5 text-left md:grid-cols-2">{plans.map((plan) => <article key={plan.cycle} className={`rounded-[2rem] border p-7 ${plan.featured ? 'border-[#2bceb0] bg-[#15352e] shadow-[0_20px_60px_rgba(12,100,81,.25)]' : 'border-white/[.1] bg-white/[.035]'}`}><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">{plan.cycle}</h3>{plan.featured && <span className="rounded-full bg-[#d7fbf1] px-3 py-1 text-xs font-bold text-[#133f34]">Melhor economia</span>}</div><p className="mt-8 text-4xl font-medium tracking-[-.05em]">{plan.price}<span className="ml-2 text-base font-normal text-[#9bb3aa]">{plan.cadence}</span></p><p className="mt-3 min-h-12 text-sm leading-6 text-[#a8c0b8]">{plan.detail}</p><div className="my-7 border-t border-white/[.12]" />{['14 dias para testar', 'Cartão solicitado após sua decisão', 'Cancelamento simples pelo painel'].map(item => <p key={item} className="mb-3 flex items-center gap-2 text-sm text-[#d4e6e0]"><Check size={16} className="text-[#63ddc5]" />{item}</p>)}<a href="/comece" className={`mt-6 flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${plan.featured ? 'bg-[#d9f7ef] text-[#0c211c]' : 'border border-white/[.18] text-white hover:bg-white/[.08]'}`}>Começar teste grátis</a></article>)}</div></div></section>

    <section id="seguranca" className="px-6 pb-24 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[2rem] border border-white/[.1] bg-[linear-gradient(120deg,#162a25,#10201c)] p-8 md:flex-row md:items-center md:justify-between md:p-12"><div><ShieldCheck className="text-[#7df0d6]" size={28} /><h2 className="mt-5 font-display text-3xl tracking-[-.04em]">Confiança começa na operação.</h2><p className="mt-3 max-w-xl leading-7 text-[#abc2ba]">Dados separados por clínica, permissões por equipe e decisões de cobrança confirmadas pelo provedor de pagamento.</p></div><a href="/comece" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1bd3ae] px-6 py-3.5 font-semibold text-[#06231d] transition hover:bg-[#82f2d9]">Conhecer a BHON <ArrowRight size={18} /></a></div></section>
    <footer className="border-t border-white/[.08] px-6 py-8 text-sm text-[#87a19a] lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} BHON. A clínica no controle.</span><div className="flex gap-5"><a href="/termos" className="hover:text-white">Termos</a><a href="/privacidade" className="hover:text-white">Privacidade</a></div></div></footer>
  </main>
);
