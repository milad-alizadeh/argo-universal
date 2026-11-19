import { describe, expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

describe('the Engine test host', () => {
  it('refuses an Engine that leaves its Voice provider undecided, so no test can start the real one', async () => {
    await expect(
      startEngineTestHost({ voiceProvider: undefined }),
    ).rejects.toThrow('Voice provider');
  });
});
