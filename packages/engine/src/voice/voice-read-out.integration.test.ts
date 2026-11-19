import { describe, expect, it } from 'vitest';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';

const job = 'Run the tests';

const told = (work: VoiceWork): string[] =>
  work.provider.call.sent.flatMap((message) =>
    message.kind === 'tell' ? [message.text] : [],
  );

const spoken = (work: VoiceWork): string[] =>
  work.provider.call.sent.flatMap((message) =>
    message.kind === 'tell' && message.delivery === 'speak'
      ? [message.text]
      : [],
  );

// A call reading out final answers only, asked for one piece of work that runs to its end.
const answersOnly = async (messages: string[]): Promise<VoiceWork> => {
  const work = await startVoiceWork([{ prompt: job, messages }]);
  await work.host.caller.voice.setCallOptions({ readOut: 'answers' });
  await work.start();
  work.provider.call.requestWork('r1', job);
  await expect.poll(work.turnEnds).toHaveLength(2);

  return work;
};

describe('what the voice reads out', () => {
  it('gives the voice only the final answer when final answers only is chosen', async () => {
    const work = await answersOnly([
      '[STATUS] Running the suite',
      '[COMPLETE] All green',
    ]);

    expect(told(work)).not.toContain('Running the suite');
    expect(spoken(work)).toContain('All green');
  });

  it('speaks the last message at the end of a Turn that gave no answer', async () => {
    const work = await answersOnly([
      '[STATUS] Running the suite',
      '[STATUS] Two tests left to look at',
    ]);

    expect(told(work)).not.toContain('Running the suite');
    expect(spoken(work)).toContain('Two tests left to look at');
  });
});
