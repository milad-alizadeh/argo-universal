import { describe, expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { startVoiceWork } from '#mocks/voice-work';
import { relayWords } from './relay-words';

const build = 'Build the lights dashboard';

const question = 'Which lights should the dashboard control?';

const useHue = 'Use Philips Hue';

describe('an Elicitation during a call', () => {
  it('is spoken to the person once, saying what it asks', async () => {
    const work = await startVoiceWork([{ prompt: build, asks: question }]);

    await work.start();
    work.provider.call.requestWork('r1', build);

    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual({
        kind: 'tell',
        text: relayWords.elicitationWaiting(question),
        delivery: 'speak',
      });
  });

  it('is settled by the next request for work, which reaches the Agent', async () => {
    const work = await startVoiceWork([
      { prompt: build, asks: question },
      { prompt: useHue },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', build);
    await waitForAcpSnapshot(
      work.host,
      work.sessionId,
      (snapshot) => snapshot.pendingElicitation !== null,
    );

    work.provider.call.requestWork('r2', useHue);

    await waitForAcpSnapshot(
      work.host,
      work.sessionId,
      (snapshot) => snapshot.pendingElicitation === null,
    );
    await expect.poll(() => JSON.stringify(work.prompts)).toContain(useHue);
  });
});
