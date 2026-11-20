import { describe, expect, it } from 'vitest';
import {
  announced,
  askedToDeploy,
  deploy,
  outcomeOf,
  personAnswers,
  replyTo,
  runDeploy,
  settled,
  waitingRequest,
} from '#mocks/conversation-answers';
import { startConversationWork } from '#mocks/conversation-work';
import { relayWords } from './relay-words';

describe('a spoken answer that applies nothing', () => {
  it('stays open when the hand-over names no turn of the person', async () => {
    const work = await askedToDeploy();

    work.provider.call.requestWork('r2', 'Allow it');

    await expect
      .poll(replyTo(work, 'r2'), { timeout: 3000 })
      .toBe(relayWords.answerNotHeard(runDeploy));
    expect(await waitingRequest(work)).toMatchObject({ title: runDeploy });
    expect(work.prompts).toHaveLength(2);
  });

  it('stays open when the named turn was heard before the announcement', async () => {
    const work = await startConversationWork([
      { prompt: deploy, asksPermission: runDeploy },
    ]);

    await work.start();
    work.provider.call.personSays('Allow it', 'turn-early');
    work.provider.call.requestWork('r1', deploy, 'turn-ask');
    await expect.poll(announced(work)).toBe(true);

    work.provider.call.requestWork('r2', 'Allow it', 'turn-early');

    await expect
      .poll(replyTo(work, 'r2'), { timeout: 3000 })
      .toBe(relayWords.answerNotHeard(runDeploy));
    expect(await waitingRequest(work)).toMatchObject({ title: runDeploy });
  });

  it("stays open when the named turn's final words never arrive", async () => {
    const work = await askedToDeploy();

    work.provider.call.requestWork('r2', 'Allow it', 'turn-unfinished');

    await expect
      .poll(replyTo(work, 'r2'), { timeout: 3000 })
      .toBe(relayWords.answerNotHeard(runDeploy));
    expect(await waitingRequest(work)).toMatchObject({ title: runDeploy });
  });

  it('answers a spoken answer for a request already settled with nothing applied', async () => {
    const work = await askedToDeploy();

    await work.host.caller.session.answerPermission({
      sessionId: work.sessionId,
      requestId: (await waitingRequest(work)).requestId,
      optionId: 'reject',
    });
    await settled(work);

    personAnswers(work, 'Allow it', 'turn-late');

    await expect
      .poll(replyTo(work, 'answer-turn-late'))
      .toBe(relayWords.alreadySettled(runDeploy));
    expect(await outcomeOf(work)()).toBe('reject_once');
    expect(work.prompts).toHaveLength(2);
  });
});
