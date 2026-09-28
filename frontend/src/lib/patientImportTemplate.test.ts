import { describe, expect, it } from 'vitest';
import { createPatientImportTemplateCsv } from './patientImportTemplate';

describe('createPatientImportTemplateCsv', () => {
  it('provides a UTF-8 CSV template with required name and a realistic patient example', () => {
    expect(createPatientImportTemplateCsv()).toBe(
      '\uFEFFnome;telefone;email;cpf;nascimento;alergias;observações;origem\r\nAna Martins;(11) 99999-0000;ana.martins@example.com;123.456.789-00;1988-05-22;Nenhuma;Prefere mensagens pela manhã;Indicação\r\n',
    );
  });
});
