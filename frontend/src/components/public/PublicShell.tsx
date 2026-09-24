import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import './public-site.css';

const links = [['Produto', '/#produto'], ['Como funciona', '/#como-funciona'], ['Planos', '/#planos'], ['Dúvidas', '/#duvidas']];
export function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 40);
    scroll();
    window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      element.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = previous; };
    }
    element.close();
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <MotionConfig reducedMotion="user"><div className="bhon-public">
    <a href="#public-main" className="public-skip">Ir para o conteúdo</a>
    <header className={'public-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="public-container public-nav">
        <a className="public-brand" href="/" aria-label="BHON, página inicial"><img src="/logo-bhon-public.png" width="1536" height="1024" alt="BHON — A clínica no controle." /></a>
        <nav className="public-desktop-nav" aria-label="Navegação principal">{links.map(([name, href]) => <a key={name} href={href}>{name}</a>)}</nav>
        <div className="public-nav-actions"><a className="public-button small outline" href="/login">Entrar no dashboard <ArrowUpRight size={14} /></a><a className="public-button small" href="/comece">Começar teste <ArrowUpRight size={15} /></a></div>
        <button ref={trigger} className="public-menu-trigger" aria-label="Abrir navegação" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(true)}><Menu /></button>
      </div>
    </header>
    <dialog ref={dialog} id="public-navigation" className="public-mobile-menu" aria-label="Navegação" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <button autoFocus onClick={close} aria-label="Fechar navegação"><X /></button>
      <nav>{links.map(([name, href], i) => <a key={name} href={href} onClick={close}><small>0{i + 1}</small>{name}</a>)}<a className="public-button outline" href="/login">Entrar no dashboard <ArrowUpRight /></a><a className="public-button" href="/comece">Começar teste</a></nav>
    </dialog>
    <main id="public-main">{children}</main>
    <footer className="public-footer">
      <div className="public-container">
        <div className="public-footer-top"><div><h2>Sua próxima fase<br />começa com uma conversa.</h2></div><a className="public-contact" href="mailto:bhonsuport@gmail.com">bhonsuport@gmail.com <ArrowUpRight /></a></div>
        <div className="public-footer-bottom"><span>© {new Date().getFullYear()} BHON. A clínica no controle.</span><nav aria-label="Informações legais"><a href="/termos">Termos de Uso</a><a href="/privacidade">Política de Privacidade</a></nav><a href="/login">Acessar minha clínica ↗</a></div>
      </div>
    </footer>
  </div></MotionConfig>;
}
