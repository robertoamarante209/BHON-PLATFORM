import { describe, expect, it } from 'vitest';
import { createSarahRecoveryDraftPath, getSarahDraftConversationId, prepareSarahRecoveryDraft } from '../../lib/operations';
import { vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', () => ({ apiRequest: request }));

describe('first recovery result', () => {
  it('abre a Sarah com contexto de preparo e não aponta para qualquer entrega externa', () => {
    const path = createSarahRecoveryDraftPath({ patientId: 'patient-1', opportunityId: 'opportunity-1' });
    expect(path).toContain('/clinic/whatsapp');
    expect(path).toContain('draft=recovery');
    expect(path).not.toContain('send');
  });

  it('persiste o preparo no backend antes de abrir a Sarah', async () => {
    request.mockResolvedValueOnce({ conversationId: 'conversation-1' });
    await expect(prepareSarahRecoveryDraft('opportunity-1')).resolves.toEqual({ conversationId: 'conversation-1' });
    expect(request).toHaveBeenCalledWith('/api/onboarding/sarah-draft', expect.objectContaining({ method: 'POST' }));
  });

  it('recupera a conversa recém-criada ao abrir a Sarah', () => {
    expect(getSarahDraftConversationId('?draft=recovery&conversationId=conversation-1')).toBe('conversation-1');
  });
});
