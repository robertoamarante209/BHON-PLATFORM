import { describe, expect, it, vi } from 'vitest';
import { installChunkRecovery } from './chunkRecovery';

describe('chunk recovery', () => {
  it('recarrega a aplicação quando um módulo antigo deixa de existir após deploy', () => {
    const target = new EventTarget();
    const reload = vi.fn();
    installChunkRecovery(target, reload);
    const event = new Event('vite:preloadError', { cancelable: true });

    target.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });
});
