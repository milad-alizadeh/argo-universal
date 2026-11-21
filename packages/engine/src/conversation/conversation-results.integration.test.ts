import { describe, expect, it } from 'vitest';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import { relayWords } from './relay-words';

const job = 'Run the tests';

const looking = 'Looking around';

const fixedBug = 'Fixed the bug';

const weatherFile = '~/Sites/london-weather/index.html';

// A result whose middle paragraph is silent analysis, through to the next mark.
const resultWithAnalysis = [
  '[COMPLETE] The page is ready.',
  `[ANALYSIS] The file is at ${weatherFile}.\nThe data comes from Open-Meteo.`,
  '[COMPLETE] Open it to look.',
].join('\n\n');

const spoken = (work: ConversationWork): string[] =>
  work.provider.call.sent.flatMap((message) =>
    message.kind === 'tell' && message.delivery === 'speak'
      ? [message.text]
      : [],
  );

const background = (work: ConversationWork): string[] =>
  work.provider.call.sent.flatMap((message) =>
    message.kind === 'tell' && message.delivery === 'background'
      ? [message.text]
      : [],
  );

const askAndWaitForEnd = async (work: ConversationWork): Promise<void> => {
  await work.start();
  work.provider.call.requestWork('r1', job);
  await expect.poll(work.turnEnds).toHaveLength(2);
};

describe('what the Agent says goes back to the voice', () => {
  it('answers the request at once, sends progress as background and the result as speech, and never Tool output', async () => {
    const work = await startConversationWork([
      {
        prompt: job,
        toolOutput: 'SECRET-TOOL-OUTPUT',
        messages: ['[STATUS] Running the suite', '[COMPLETE] All green'],
      },
    ]);

    await askAndWaitForEnd(work);

    expect(work.provider.call.sent[0]).toMatchObject({
      kind: 'reply',
      requestId: 'r1',
    });
    expect(background(work)).toContain('Running the suite');
    expect(spoken(work)).toContain('All green');
    expect(JSON.stringify(work.provider.call.sent)).not.toContain(
      'SECRET-TOOL-OUTPUT',
    );
  });

  it('sends a long message in pieces of at most 500 bytes, losing nothing', async () => {
    const words = Array.from({ length: 300 }, (_, index) => `word${index}`);
    const long = words.join(' ');

    const work = await startConversationWork([
      { prompt: job, messages: [`[COMPLETE] ${long}`] },
    ]);

    await askAndWaitForEnd(work);

    const pieces = spoken(work).filter((text) => text.startsWith('word'));
    expect(pieces.length).toBeGreaterThan(1);

    for (const piece of pieces)
      expect(Buffer.byteLength(piece)).toBeLessThanOrEqual(500);

    expect(pieces.join(' ')).toBe(long);
  });

  it('sends a long progress message in pieces of at most 500 bytes as background', async () => {
    const long = Array.from({ length: 300 }, (_, i) => `step${i}`).join(' ');

    const work = await startConversationWork([
      { prompt: job, messages: [`[STATUS] ${long}`, '[COMPLETE] Done'] },
    ]);

    await askAndWaitForEnd(work);

    const pieces = background(work).filter((text) => text.startsWith('step'));
    expect(pieces.length).toBeGreaterThan(1);

    for (const piece of pieces)
      expect(Buffer.byteLength(piece)).toBeLessThanOrEqual(500);

    expect(pieces.join(' ')).toBe(long);
    expect(spoken(work).some((text) => text.startsWith('step'))).toBe(false);
  });

  it('counts an unmarked message as progress until the Turn ends, then speaks the last', async () => {
    const work = await startConversationWork([
      { prompt: job, messages: [looking, fixedBug] },
    ]);

    await askAndWaitForEnd(work);

    expect(background(work)).toEqual(
      expect.arrayContaining([looking, fixedBug]),
    );
    expect(spoken(work)).toContain(fixedBug);
    expect(spoken(work)).not.toContain(looking);
  });

  it('never tells the voice silent analysis', async () => {
    const work = await startConversationWork([
      {
        prompt: job,
        messages: ['[ANALYSIS] The cache is stale', '[COMPLETE] Cleared it'],
      },
    ]);

    await askAndWaitForEnd(work);

    expect(work.provider.call.sent.map(({ text }) => text)).not.toContain(
      'The cache is stale',
    );
    expect(spoken(work)).toContain('Cleared it');
  });

  it.each([
    ['whole', undefined],
    ['in chunks', 7],
  ])(
    'never tells the voice an analysis paragraph inside a result, %s',
    async (_, chunkSize) => {
      const work = await startConversationWork([
        { prompt: job, chunkSize, messages: [resultWithAnalysis] },
      ]);

      await askAndWaitForEnd(work);

      expect(spoken(work)).toEqual(
        expect.arrayContaining(['The page is ready.', 'Open it to look.']),
      );
      expect(JSON.stringify(work.provider.call.sent)).not.toContain(
        weatherFile,
      );
    },
  );

  it('tells the voice when a Turn ends, and when it fails', async () => {
    const work = await startConversationWork([
      { prompt: job, messages: ['[COMPLETE] Done'] },
      { prompt: 'Break it', fails: 'The Agent crashed' },
    ]);

    await askAndWaitForEnd(work);
    expect(background(work)).toContain(relayWords.finished);

    work.provider.call.requestWork('r2', 'Break it');
    await expect
      .poll(() => spoken(work).join('\n'))
      .toContain(relayWords.failed('').trim());
    expect(spoken(work).join('\n')).toContain('The Agent crashed');
  });
});
