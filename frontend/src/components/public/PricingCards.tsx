import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { PublicReveal } from './PublicReveal';
export function PricingCards() {
  return <section id="planos" className="public-section public-pricing"><div className="public-container">
    <PublicReveal><p className="public-kicker">04 / UM PRODUTO. DOIS JEITOS DE CONTRATAR.</p><div className="public-section-heading"><h2>Seu ritmo.<br /><span>Seu plano.</span></h2><p>Escolha o período da assinatura.<br />A BHON é a mesma nos dois planos.</p></div></PublicReveal>
    <div className="public-plan-grid">{[{ name: 'Mensal', price: 'R$ 290', period: '/ mês', detail: 'Flexibilidade para começar.', featured: false }, { name: 'Anual', price: 'R$ 2.900', period: '/ ano', detail: 'Pague 10 meses e use 12. Economia de R$ 580.', featured: true }].map(plan => <PublicReveal key={plan.name} className={'public-plan' + (plan.featured ? ' featured' : '')}><div className="public-plan-title"><h3>{plan.name}</h3>{plan.featured && <span>2 MESES DE ECONOMIA</span>}</div><p className="public-price"><strong>{plan.price}</strong><span>{plan.period}</span></p><p>{plan.detail}</p><ul>{['14 dias para testar', 'Agenda, pacientes e equipe', 'Orçamentos e acompanhamentos', 'Acesso pelo computador e celular'].map(item => <li key={item}><Check size={16} />{item}</li>)}</ul><a className={'public-button ' + (plan.featured ? '' : 'outline')} href="/comece">Começar teste grátis <ArrowUpRight size={18} /></a><small>{plan.featured ? 'Cobrança anual de R$ 2.900 após o teste.' : 'Cobrança mensal de R$ 290 após o teste.'}</small></PublicReveal>)}</div>
    <p className="public-trial-note">Cartão solicitado no cadastro. A assinatura renova automaticamente; cancele antes do fim do teste para evitar a primeira cobrança. Precisa de ajuda? <a href="mailto:bhonsuport@gmail.com">Fale com a BHON.</a></p>
  </div></section>;
}

