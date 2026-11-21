import { describe, expect, it } from 'vitest';
import {
  callOf,
  endedOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { pause, statusOf } from '#mocks/conversation-timing';
import {
  promptText,
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import { runOperation } from '#mocks/operations';

const hangUp = (
  session: Awaited<ReturnType<typeof openConversationSession>>,
  params: { sessionId?: string } = {},
): ReturnType<typeof runOperation> =>
  runOperation(session.caller.operations, {
    id: 'conversation.hangUp',
    params,
    wait: true,
  });

const notices = async (work: ConversationWork): Promise<unknown[]> =>
  (await work.feed()).filter((row) => row.sessionUpdate === 'notice');

describe('an Agent hangs up the Conversation', () => {
  it('ends its own Session call, recorded as ended by the Agent', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const session = await openConversationSession(voice);
    await host.caller.conversation.start({
      sessionId: session.sessionId,
      offer,
    });

    expect(await hangUp(session)).toEqual({ ended: true });
    expect(await callOf(host)).toBeNull();
    expect(await endedOf(host)).toMatchObject({ reason: 'agent' });
    expect(provider.call.ended).toBe(true);
  });

  it('is refused when its Session has no call', async () => {
    const voice = await startConversationEngine();
    const session = await openConversationSession(voice);

    await expect(hangUp(session)).rejects.toThrow('no Conversation');
  });

  it('is refused for a Session that has no call while another Session has one', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const first = await openConversationSession(voice);
    const second = await openConversationSession(voice);
    await host.caller.conversation.start({ sessionId: first.sessionId, offer });

    await expect(hangUp(second)).rejects.toThrow('no Conversation');
    expect(await callOf(host)).not.toBeNull();
    expect(provider.call.ended).toBe(false);
  });

  it("cannot end another Session's call", async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const first = await openConversationSession(voice);
    const second = await openConversationSession(voice);
    await host.caller.conversation.start({ sessionId: first.sessionId, offer });

    await expect(
      hangUp(second, { sessionId: first.sessionId }),
    ).rejects.toThrow(/own Session/);
    expect(provider.call.ended).toBe(false);
  });

  it('is told, in the voice instruction, to hang up only when the person means to end the call', async () => {
    const work = await startConversationWork([{ prompt: 'Job', messages: [] }]);
    await work.start();
    work.provider.call.requestWork('r1', 'Job');
    await expect.poll(() => work.prompts.length).toBe(2);

    const instruction = promptText(work.prompts[1]);

    expect(instruction).toContain('conversation.hangUp');
    expect(instruction).toMatch(/clearly/i);
    expect(instruction).toMatch(/stop work|pause/i);
  });
});

it('keeps the Conversation open for a pause', async () => {
  const pauseWords = 'Please pause and wait';

  const work = await startConversationWork([
    { prompt: pauseWords, messages: ['[COMPLETE] Paused.'] },
  ]);

  await work.start();
  const call = work.provider.call;

  call.requestWork('wait', pauseWords, 'pause');
  call.personSays(pauseWords, 'pause');
  call.emit({ type: 'person.turn.completed', id: 'pause', text: pauseWords });
  await expect.poll(work.turnEnds).toHaveLength(2);
  expect((await statusOf(work)).conversation).not.toBeNull();
});

it('ends on a completed goodbye without a hand-over', async () => {
  const goodbyeWords = 'Goodbye, please end this Conversation';
  const work = await startConversationWork([]);

  await work.start();
  const call = work.provider.call;

  call.personSays(goodbyeWords, 'bye');
  expect((await statusOf(work)).conversation).not.toBeNull();
  call.emit({
    type: 'person.turn.completed',
    id: 'bye',
    text: goodbyeWords,
  });
  await expect
    .poll(() => statusOf(work))
    .toMatchObject({
      conversation: null,
      ended: { reason: 'person' },
    });
  expect(work.prompts).toHaveLength(1);
  expect(call.ended).toBe(true);
});

describe('the provider reports its allowance', () => {
  it('shows a warning on the call status while the call runs', async () => {
    const work = await startConversationWork([]);
    await work.start();
    expect((await statusOf(work)).conversation).not.toHaveProperty('limit');

    work.provider.call.emit({
      type: 'limit',
      remaining: 0.1,
      resetsAt: '2026-11-19T00:00:00.000Z',
    });

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({
        conversation: {
          limit: { remaining: 0.1, resetsAt: '2026-11-19T00:00:00.000Z' },
        },
      });
  });

  it('ends with one Notice when the provider closes the call for a reached limit', async () => {
    const work = await startConversationWork([]);
    await work.start();
    const before = (await notices(work)).length;

    work.provider.call.close('limit');

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({
        conversation: null,
        ended: { reason: 'limit-reached' },
      });
    await expect
      .poll(async () => (await notices(work)).length)
      .toBe(before + 1);
    await pause(300);
    expect(await notices(work)).toHaveLength(before + 1);
    expect(await notices(work)).toContainEqual(
      expect.objectContaining({
        title: expect.stringContaining('usage limit'),
      }),
    );
  });
});
