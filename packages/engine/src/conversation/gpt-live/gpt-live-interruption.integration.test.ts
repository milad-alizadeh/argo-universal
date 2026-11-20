import { afterEach, describe, expect, it } from 'vitest';
import { interruptedCall } from '#mocks/gpt-live-interruption-frames';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';
import type { ConversationProviderEvent } from '../provider';
import { isTranscript, type TranscriptEvent } from '../transcript';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

// A started call that has been sent `frames`, with everything it reported.
async function replayed(frames: string[]): Promise<ConversationProviderEvent[]> {
  const started = await startedCall();
  fixture = started;
  const events = heard(started.call);

  for (const frame of frames) started.endpoint.send(frame);

  return events;
}

type Said = { speaker: 'person' | 'voice' | 'closed'; text: string };

const finalIn = (event: TranscriptEvent): Said[] =>
  event.final
    ? [
        {
          speaker: event.type === 'person.transcript' ? 'person' : 'voice',
          text: event.text,
        },
      ]
    : [];

const saidIn = (event: ConversationProviderEvent): Said[] => {
  if (event.type === 'closed') return [{ speaker: 'closed', text: '' }];

  return isTranscript(event) ? finalIn(event) : [];
};

// What became a final row, and the call closing, in the order reported.
const saidOf = (events: ConversationProviderEvent[]): Said[] => events.flatMap(saidIn);

const voiceTurn = 'turn_EloGjCCjDx5JEFpanncDe';

const personTurn = 'turn_EloGrw0IrLqSUAafunf1k';

const isDone =
  (turn: string) =>
  (frame: string): boolean =>
    frame.includes('"turn.done"') && frame.includes(turn);

const voiceCut =
  'Sure. The story starts in the early 1800s with the so-called draisine or "running machine." It';

const personCut = 'Wait, stop, stop please. What is two plus two?';

const asSpoken: Said[] = [
  { speaker: 'voice', text: voiceCut },
  { speaker: 'person', text: personCut },
  { speaker: 'voice', text: 'Four.' },
];

const without = (dropped: (frame: string) => boolean): string[] =>
  interruptedCall.filter((frame) => !dropped(frame));

// The voice's cut-off turn as done, but with no transcript of its own.
const emptied = (frame: string): string =>
  isDone(voiceTurn)(frame)
    ? frame.replace(/"transcript":"[^}]*"/, '"transcript":""')
    : frame;

describe('GPT-Live call interrupted by the person', () => {
  it('keeps what the voice said up to the interruption, then the person’s words, in spoken order', async () => {
    const events = await replayed(interruptedCall);

    await expect.poll(() => saidOf(events)).toEqual(asSpoken);
  });

  it('keeps the cut-off words when the voice’s next turn opens before its turn is done', async () => {
    const events = await replayed(without(isDone(voiceTurn)));

    await expect.poll(() => saidOf(events)).toEqual(asSpoken);
  });

  it('keeps the words heard when a turn is done with no transcript of its own', async () => {
    const events = await replayed(interruptedCall.map(emptied));

    await expect.poll(() => saidOf(events)).toEqual(asSpoken);
  });

  it('keeps the person’s words heard so far when the call closes before their turn is done', async () => {
    const cut = interruptedCall.findIndex(isDone(personTurn));

    const events = await replayed([
      ...interruptedCall.slice(0, cut),
      '{"type":"session.closed","reason":"client_request"}',
    ]);

    await expect
      .poll(() => saidOf(events))
      .toEqual([
        { speaker: 'voice', text: voiceCut },
        { speaker: 'person', text: personCut },
        { speaker: 'closed', text: '' },
      ]);
  });
});
