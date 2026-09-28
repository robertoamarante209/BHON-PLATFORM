const patientImportHeaders = [
  'nome',
  'telefone',
  'email',
  'cpf',
  'nascimento',
  'alergias',
  'observações',
  'origem',
];

const patientImportExample = [
  'Ana Martins',
  '(11) 99999-0000',
  'ana.martins@example.com',
  '123.456.789-00',
  '1988-05-22',
  'Nenhuma',
  'Prefere mensagens pela manhã',
  'Indicação',
];

export const createPatientImportTemplateCsv = () =>
  `\uFEFF${patientImportHeaders.join(';')}\r\n${patientImportExample.join(';')}\r\n`;
