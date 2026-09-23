import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const TrialSuccessPage: React.FC = () => <main className="grid min-h-screen place-items-center bg-[#0b1211] p-6 text-center text-[#f3f7f5]"><section className="max-w-md"><CheckCircle2 className="mx-auto text-[#69e6ca]" size={40} /><p className="mt-7 text-xs font-bold tracking-[.17em] text-[#7ee3ce] uppercase">Cadastro recebido</p><h1 className="mt-4 font-display text-4xl tracking-[-.05em]">Estamos confirmando seu ambiente.</h1><p className="mt-5 leading-7 text-[#acc1ba]">Assim que a confirmação segura chegar, sua clínica estará pronta para entrar na BHON.</p><a href="/login" className="mt-8 inline-flex rounded-full bg-[#d9f7ef] px-5 py-3 font-semibold text-[#0a201a]">Ir para o login</a></section></main>;
