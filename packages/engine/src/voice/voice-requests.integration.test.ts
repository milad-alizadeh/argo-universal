import { describe, expect, it } from 'vitest';
import { promptText, startVoiceWork } from '#mocks/voice-work';

const fixBuild = 'Fix the build';

const firstJob = 'First job';

const secondJob = 'Second job';

const fixed = '[COMPLETE] Fixed it';

describe('a request for work from the voice', () => {
  it('reaches the Agent as a Prompt from the Voice call, stored in the Feed', async () => {
    const work = await startVoiceWork([
      { prompt: fixBuild, messages: [fixed] },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', fixBuild);

    await expect.poll(() => work.prompts.length).toBe(2);
    expect(promptText(work.prompts[1])).toContain(fixBuild);
    await expect.poll(work.promptRows).toMatchObject([
      {
        content: [{ type: 'text', text: expect.stringContaining(fixBuild) }],
        _meta: { argo: { sender: { type: 'voice' } } },
      },
    ]);
  });

  it('starts a Turn with its own Prompt row and stop reason', async () => {
    const work = await startVoiceWork([
      { prompt: fixBuild, messages: [fixed] },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', fixBuild);

    await expect.poll(work.turnEnds).toHaveLength(2);
    const [prompt] = await work.promptRows();
    const ends = await work.turnEnds();
    expect(ends.at(-1)).toMatchObject({
      turnId: prompt?.turnId,
      _meta: { argo: { turnEnd: { stopReason: 'end_turn' } } },
    });
  });

  it('carries the voice instruction in the first Prompt of a call and not the later ones', async () => {
    const work = await startVoiceWork([
      { prompt: firstJob, messages: ['[COMPLETE] One'] },
      { prompt: secondJob, messages: ['[COMPLETE] Two'] },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', firstJob);
    await expect.poll(work.turnEnds).toHaveLength(2);
    work.provider.call.requestWork('r2', secondJob);
    await expect.poll(() => work.prompts.length).toBe(3);

    const [, first, second] = work.prompts.map((request) =>
      promptText(request),
    );

    expect(first).toMatch(/\[STATUS\][\s\S]*\[COMPLETE\][\s\S]*\[ANALYSIS\]/);
    expect(second).not.toContain('[STATUS]');
    expect(second).toContain(secondJob);
  });
});
