import { describe, expect, it } from 'vitest';
import { promptText, startVoiceWork } from '#mocks/conversation-work';
import { relayWords } from './relay-words';

const longJob = 'Long job';

const extra = 'Extra job';

describe('a request for work while a Turn runs', () => {
  it('waits in the queue when the Agent cannot be steered, as a typed Prompt does', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startVoiceWork([
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
      { _meta: { argo: { sender: { type: 'voice' } } } },
      {
        content: [{ text: extra }],
        _meta: { argo: { sender: { type: 'voice' } } },
      },
    ]);
  });

  it('steers the running Turn when the Agent supports it, stored from the Voice call and not as the person', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startVoiceWork(
      [{ prompt: longJob, holdUntil: release.promise }],
      { steering: true },
    );

    await work.start();
    work.provider.call.requestWork('r1', longJob);
    await expect.poll(() => work.prompts.length).toBe(2);
    work.provider.call.requestWork('r2', extra);

    expect(JSON.stringify(await work.steered)).toContain(extra);
    await expect
      .poll(() => work.provider.call.sent)
      .toContainEqual(
        expect.objectContaining({ requestId: 'r2', text: relayWords.steered }),
      );
    await expect.poll(async () => (await work.promptRows()).length).toBe(2);
    expect(await work.promptRows()).toMatchObject([
      { _meta: { argo: { sender: { type: 'voice' } } } },
      {
        content: [{ text: extra }],
        _meta: { argo: { sender: { type: 'voice' } } },
      },
    ]);
    expect(work.prompts).toHaveLength(2);
    release.resolve();
    await expect.poll(work.turnEnds).toHaveLength(2);
  });

  it('waits in the queue when the Agent refuses to be steered, and the voice is told why', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startVoiceWork(
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
      { _meta: { argo: { sender: { type: 'voice' } } } },
      {
        content: [{ text: extra }],
        _meta: { argo: { sender: { type: 'voice' } } },
      },
    ]);
  });
});
