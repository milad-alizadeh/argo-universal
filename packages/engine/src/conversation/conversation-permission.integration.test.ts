import { describe, expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import type { FakeVoiceMessage } from './fake-provider';
import { relayWords } from './relay-words';

const deploy = 'Deploy the site';

const runDeploy = 'Run npm run deploy';

const later = 'Then tidy up';

const spokenPermissions = (work: ConversationWork) => (): FakeVoiceMessage[] =>
  work.provider.call.sent.filter(
    ({ text }) => text === relayWords.permissionWaiting(runDeploy),
  );

const replyTo =
  (work: ConversationWork, requestId: string) =>
  (): FakeVoiceMessage | undefined =>
    work.provider.call.sent.find(
      (say) => say.kind === 'reply' && say.requestId === requestId,
    );

describe('a Permission request during a call', () => {
  it('is spoken to the person, saying what it is for', async () => {
    const work = await startConversationWork([
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
    const work = await startConversationWork([
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

  it('is never claimed answered when the person speaks while it waits', async () => {
    const work = await startConversationWork([
      { prompt: deploy, asksPermission: runDeploy },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', deploy);
    await expect.poll(spokenPermissions(work)).toHaveLength(1);

    work.provider.call.personSays('Allow it');
    work.provider.call.requestWork('r2', 'Allow it');

    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual(
        expect.objectContaining({
          kind: 'reply',
          requestId: 'r2',
          text: expect.stringContaining(
            relayWords.permissionStillWaiting(runDeploy),
          ),
        }),
      );

    const snapshot = await waitForAcpSnapshot(
      work.host,
      work.sessionId,
      (next) => next.pendingPermission !== null,
    );

    expect(snapshot.pendingPermission?.title).toBe(runDeploy);
  });

  it('is answered by a click during a call, after which the voice is not told it waits', async () => {
    const work = await startConversationWork([
      { prompt: deploy, asksPermission: runDeploy, messages: ['Deployed'] },
      { prompt: later },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', deploy);

    const { pendingPermission } = await waitForAcpSnapshot(
      work.host,
      work.sessionId,
      (next) => next.pendingPermission !== null,
    );

    await work.host.caller.session.answerPermission({
      sessionId: work.sessionId,
      requestId: pendingPermission?.requestId ?? '',
      optionId: 'allow',
    });
    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual(expect.objectContaining({ text: 'Deployed' }));

    work.provider.call.requestWork('r2', later);

    await expect.poll(replyTo(work, 'r2')).toBeDefined();
    expect(JSON.stringify(work.provider.call.sent)).not.toContain(
      relayWords.permissionStillWaiting(runDeploy),
    );
  });
});
