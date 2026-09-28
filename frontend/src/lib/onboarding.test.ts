import { describe, expect, it, vi } from 'vitest';
import { completeActivationStep, getActivationSnapshot } from './onboarding';

const request = vi.hoisted(() => vi.fn());
vi.mock('./api', () => ({ apiRequest: request }));

describe('onboarding client', () => {
  it('busca o roteiro da clínica autenticada', async () => {
    request.mockResolvedValueOnce({ dismissed: false });
    await expect(getActivationSnapshot()).resolves.toEqual({ dismissed: false });
    expect(request).toHaveBeenCalledWith('/api/onboarding');
  });

  it('conclui somente uma etapa tipada', async () => {
    request.mockResolvedValueOnce({ dismissed: false });
    await completeActivationStep('PATIENTS');
    expect(request).toHaveBeenCalledWith('/api/onboarding/steps/PATIENTS', expect.objectContaining({ method: 'PATCH' }));
  });
});
