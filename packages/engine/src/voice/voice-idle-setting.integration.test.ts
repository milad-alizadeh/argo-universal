import { describe, expect, it } from 'vitest';
import { statusOf } from '#mocks/voice-timing';
import { startVoiceWork } from '#mocks/voice-work';

const slow = 30_000;

describe('the idle timeout the person chose', () => {
  it(
    'ends a silent call after it',
    async () => {
      const chosenSeconds = 5;
      const work = await startVoiceWork([]);
      await work.host.caller.voice.setCallOptions({
        idleSeconds: chosenSeconds,
      });
      await work.start();
      const startedAt = Date.now();

      await expect
        .poll(() => statusOf(work), { timeout: 15_000 })
        .toMatchObject({ call: null, ended: { reason: 'idle' } });
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(
        chosenSeconds * 1000,
      );
    },
    slow,
  );
});
