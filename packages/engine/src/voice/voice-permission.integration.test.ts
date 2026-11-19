import { describe, expect, it } from 'vitest';
import { startVoiceWork } from '#mocks/voice-work';
import { relayWords } from './relay-words';

const deploy = 'Deploy the site';

const runDeploy = 'Run npm run deploy';

describe('a Permission request during a call', () => {
  it('is spoken to the person, saying what it is for', async () => {
    const work = await startVoiceWork([
      { prompt: deploy, asksPermission: runDeploy },
    ]);

    await work.start();

    work.provider.call.requestWork('r1', deploy);

    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual({
        kind: 'tell',
        text: relayWords.permissionWaiting(runDeploy),
        delivery: 'speak',
      });
  });

  it('is spoken once while it waits', async () => {
    const work = await startVoiceWork([
      { prompt: deploy, asksPermission: runDeploy },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', deploy);
    await expect.poll(() => work.provider.call.sent.length).toBeGreaterThan(1);

    work.provider.call.personSays('Anything new?');
    await expect
      .poll(work.feed)
      .toContainEqual(
        expect.objectContaining({ sessionUpdate: 'person_transcript' }),
      );

    expect(
      work.provider.call.sent.filter(
        ({ text }) => text === relayWords.permissionWaiting(runDeploy),
      ),
    ).toHaveLength(1);
  });
});
