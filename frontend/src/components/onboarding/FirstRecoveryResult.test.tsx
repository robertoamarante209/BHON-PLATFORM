import { describe, expect, it } from 'vitest';
import { createSarahRecoveryDraftPath } from '../../lib/operations';

describe('first recovery result', () => {
  it('abre a Sarah com contexto de preparo e não aponta para qualquer entrega externa', () => {
    const path = createSarahRecoveryDraftPath({ patientId: 'patient-1', opportunityId: 'opportunity-1' });
    expect(path).toContain('/clinic/whatsapp');
    expect(path).toContain('draft=recovery');
    expect(path).not.toContain('send');
  });
});
