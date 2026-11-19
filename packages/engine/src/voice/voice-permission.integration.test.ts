import { describe, expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';
import type { FakeVoiceMessage } from './fake-provider';
import { relayWords } from './relay-words';

const deploy = 'Deploy the site';

const runDeploy = 'Run npm run deploy';

const later = 'Then tidy up';

const spokenPermissions = (work: VoiceWork) => (): FakeVoiceMessage[] =>
  work.provider.call.sent.filter(
    ({ text }) => text === relayWords.permissionWaiting(runDeploy),
  );

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

  it('is spoken once while it waits, however the Session changes', async () => {
    const work = await startVoiceWork([
      { prompt: deploy, asksPermission: runDeploy },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', deploy);
    await expect.poll(spokenPermissions(work)).toHaveLength(1);

    await work.host.caller.session.queue({
      sessionId: work.sessionId,
      command: { action: 'append', prompt: [{ type: 'text', text: later }] },
    });
    await waitForAcpSnapshot(
      work.host,
      work.sessionId,
      (snapshot) =>
        snapshot.promptQueue.items.length > 0 &&
        snapshot.pendingPermission !== null,
    );

    expect(spokenPermissions(work)()).toHaveLength(1);
  });
});
