import React from 'react';
export function PublicFaq() {
  const questions = [
    ['A BHON é só para clínicas odontológicas?', 'Não. A BHON reúne rotinas de gestão compartilhadas por clínicas de diferentes especialidades: agenda, pacientes, equipe, orçamentos e acompanhamento. Durante o teste, avalie como essas funções se encaixam no seu atendimento.'],
    ['Como funcionam os 14 dias de teste?', 'Você cadastra a clínica, escolhe o plano e informa o cartão no checkout da Stripe. Não há cobrança da assinatura durante os primeiros 14 dias. Ao final, começa a cobrança do período escolhido, caso o teste não tenha sido cancelado.'],
    ['Posso trazer os pacientes do sistema atual?', 'Você pode importar uma planilha, revisar as colunas e conferir os dados antes de concluir o cadastro. A importação depende da estrutura e da qualidade do arquivo; nossa equipe pode orientar a preparação.'],
    ['A recuperação de orçamentos é automática?', 'A BHON organiza os acompanhamentos, responsáveis e próximos contatos. Sua equipe acompanha cada oportunidade. O envio automático depende da integração de mensagens e da configuração do canal; confirme a disponibilidade com nosso suporte.'],
    ['Como faço para cancelar?', 'Você pode solicitar o cancelamento pelo suporte em bhonsuport@gmail.com. Informe o e-mail da clínica. Para evitar a primeira cobrança, faça a solicitação antes do término dos 14 dias de teste.'],
    ['Minha equipe pode ter acessos próprios?', 'Sim. A clínica pode criar acessos para a equipe e definir permissões por função, mantendo as rotinas organizadas e cada pessoa com acesso ao que precisa.'],
  ];
  return <section id="duvidas" className="public-section public-faq"><div className="public-container public-faq-grid"><div><h2>Vamos deixar<br />tudo claro.</h2><p>Uma boa escolha começa<br />com boas respostas.</p></div><div>{questions.map(([question, answer], i) => <details key={question}><summary><span><small>0{i+1}</small>{question}</span><b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}</div></div></section>;
}
