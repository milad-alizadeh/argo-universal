import { describe, expect, it } from 'vitest';
import {
  askedToDeploy,
  outcomeOf,
  personAnswers,
  replyTo,
  runDeploy,
  waitingRequest,
} from '#mocks/conversation-answers';
import { statusOf } from '#mocks/conversation-timing';
import { relayWords } from './relay-words';

describe('a Permission request announced during a call', () => {
  it("is announced with its title, kind, target and the Agent's name, and the two answers the voice may take", async () => {
    const work = await askedToDeploy();

    expect(work.provider.call.sent).toContainEqual({
      kind: 'tell',
      text: relayWords.permissionWaiting({
        // The mock Agent has no Registry entry, so its id stands in for its name.
        agent: 'mock',
        title: runDeploy,
        kind: 'execute',
        target: 'npm run deploy',
      }),
      delivery: 'speak',
    });
  });

  it('is allowed once by a spoken allow, and the Agent carries on', async () => {
    const work = await askedToDeploy();

    personAnswers(work, 'Yes, allow it', 'turn-allow');

    await expect
      .poll(replyTo(work, 'answer-turn-allow'))
      .toBe(relayWords.allowedOnce(runDeploy));
    await expect.poll(outcomeOf(work)).toBe('allow_once');
    expect(work.prompts).toHaveLength(2);
  });

  it('is rejected by a spoken reject, even one that says "allow"', async () => {
    const work = await askedToDeploy();

    personAnswers(work, "No, don't allow it", 'turn-reject');

    await expect
      .poll(replyTo(work, 'answer-turn-reject'))
      .toBe(relayWords.rejected(runDeploy));
    await expect.poll(outcomeOf(work)).toBe('reject_once');
    expect(work.prompts).toHaveLength(2);
  });

  it('is never allowed always by voice', async () => {
    const work = await askedToDeploy();

    personAnswers(work, 'Always allow it', 'turn-always');

    await expect
      .poll(replyTo(work, 'answer-turn-always'))
      .toBe(relayWords.alwaysAllowOnScreen(runDeploy));
    expect(await waitingRequest(work)).toMatchObject({ title: runDeploy });
    expect(work.prompts).toHaveLength(2);
  });

  it('is cancelled with its Turn by a spoken stop, and the call stays up', async () => {
    const work = await askedToDeploy();

    personAnswers(work, 'Stop working', 'turn-stop');

    await expect
      .poll(replyTo(work, 'answer-turn-stop'))
      .toBe(relayWords.stopping);
    await expect.poll(outcomeOf(work)).toBe('cancelled');
    await expect.poll(work.turnEnds).toHaveLength(2);
    expect((await work.turnEnds()).at(-1)).toMatchObject({
      _meta: { argo: { turnEnd: { stopReason: 'cancelled' } } },
    });
    expect(await statusOf(work)).toMatchObject({
      conversation: { sessionId: work.sessionId },
    });
  });
});
