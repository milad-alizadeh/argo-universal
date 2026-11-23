import { describe, expect, it } from 'vitest';
import { messageRows } from '#mocks/conversation-feed-rows';
import { promptText, startConversationWork } from '#mocks/conversation-work';
import { relayWords } from './relay-words';

const longJob = 'Long job';

const extra = 'Extra job';

describe('a request for work while a Turn runs', () => {
  it('waits in the queue when the Agent cannot be steered, as a typed Prompt does', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startConversationWork([
      { prompt: longJob, holdUntil: release.promise },
      { prompt: extra, messages: ['[COMPLETE] Did the extra'] },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', longJob);
    await expect.poll(() => work.prompts.length).toBe(2);
    work.provider.call.requestWork('r2', extra);

    await expect
      .poll(() => JSON.stringify(work.provider.call.sent))
      .toContain(relayWords.queued);
    expect(work.prompts).toHaveLength(2);

    release.resolve();
    await expect.poll(() => work.prompts.length).toBe(3);
    expect(promptText(work.prompts[2])).toContain(extra);
    await expect.poll(work.turnEnds).toHaveLength(3);
    expect(await work.promptRows()).toMatchObject([
      { _meta: { argo: { sender: { type: 'conversation' } } } },
      {
        content: [{ text: extra }],
        _meta: { argo: { sender: { type: 'conversation' } } },
      },
    ]);
  });

  it('steers the running Turn when the Agent supports it, stored from the Conversation and not as the person', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startConversationWork(
      [{ prompt: longJob, holdUntil: release.promise }],
      { steering: true },
    );

    await work.start();
    work.provider.call.requestWork('r1', longJob);
    await expect.poll(() => work.prompts.length).toBe(2);
    work.provider.call.personSays('Use the desktop header on both.');
    work.provider.call.requestWork('r2', extra);

    const steered = JSON.stringify(await work.steered);
    expect(steered).toContain(extra);
    expect(steered).toContain('Use the desktop header on both.');
    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual(
        expect.objectContaining({ requestId: 'r2', text: relayWords.steered }),
      );
    await expect.poll(async () => (await work.promptRows()).length).toBe(2);
    expect(await work.promptRows()).toMatchObject([
      { _meta: { argo: { sender: { type: 'conversation' } } } },
      {
        content: [{ text: extra }],
        _meta: { argo: { sender: { type: 'conversation' } } },
      },
    ]);
    expect(work.prompts).toHaveLength(2);
    release.resolve();
    await expect.poll(work.turnEnds).toHaveLength(2);
  });

  it('waits in the queue when the Agent refuses to be steered, and the voice is told why', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startConversationWork(
      [
        { prompt: longJob, holdUntil: release.promise },
        { prompt: extra, messages: ['[COMPLETE] Did the extra'] },
      ],
      { steering: 'refused' },
    );

    await work.start();
    work.provider.call.requestWork('r1', longJob);
    await expect.poll(() => work.prompts.length).toBe(2);
    work.provider.call.requestWork('r2', extra);

    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual(
        expect.objectContaining({
          requestId: 'r2',
          text: relayWords.notSteered(
            'The Agent did not accept steering; your Prompt was kept',
          ),
        }),
      );

    release.resolve();
    await expect.poll(() => work.prompts.length).toBe(3);
    expect(promptText(work.prompts[2])).toContain(extra);
    await expect.poll(work.turnEnds).toHaveLength(3);
    expect(await work.promptRows()).toMatchObject([
      { _meta: { argo: { sender: { type: 'conversation' } } } },
      {
        content: [{ text: extra }],
        _meta: { argo: { sender: { type: 'conversation' } } },
      },
    ]);
  });
});

describe('spoken turns during Agent activity', () => {
  it('uses the whole spoken request without letting a later request overtake it', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startConversationWork([
      { prompt: longJob, holdUntil: release.promise },
    ]);

    await work.start();
    const { call } = work.provider;
    call.requestWork('r1', longJob);
    await expect.poll(() => work.prompts).toHaveLength(2);

    const request =
      'Monitor the open Sessions and put the archive ticket first.';

    call.requestWork('r2', 'put the archive ticket first.', 'p1');
    call.personSays('Monitor the open Sessions', 'p1');
    call.requestWork('r3', extra);
    call.personSays(request, 'p1');
    call.emit({ type: 'person.turn.completed', id: 'p1', text: request });
    await expect
      .poll(() => call.sent)
      .toContainEqual(
        expect.objectContaining({ requestId: 'r3', text: relayWords.queued }),
      );

    release.resolve();
    await expect.poll(() => work.prompts).toHaveLength(3);
    expect(work.prompts[2]?.prompt.slice(-2)).toMatchObject([
      { type: 'text', text: request },
      { type: 'text', text: extra },
    ]);
  });

  it('keeps the spoken exchange in Feed order through steering, cancellation and hang-up', async () => {
    const work = await startConversationWork(
      [{ prompt: longJob, untilCancelled: true }],
      { steering: true },
    );

    await work.start();
    const { call } = work.provider;
    call.requestWork('r1', longJob);
    await expect.poll(() => work.prompts).toHaveLength(2);

    call.personSays('Check the archive ticket.', 'p1');
    call.requestWork('r2', extra);
    call.voiceSays('Understood.', 'v1');
    call.personSays('Thanks.', 'p2');
    call.wordsAtEnd.push({
      type: 'voice.transcript',
      id: 'v2',
      text: 'You’re welcome.',
      final: true,
    });
    await work.steered;
    await expect.poll(work.promptRows).toHaveLength(2);
    await work.host.caller.session.cancel({ sessionId: work.sessionId });
    await work.host.caller.conversation.end({ sessionId: work.sessionId });

    await expect
      .poll(() => messageRows(work))
      .toEqual([
        'person_transcript: Check the archive ticket.',
        'voice_transcript: Understood.',
        'person_transcript: Thanks.',
        'voice_transcript: You’re welcome.',
      ]);
  });
});
