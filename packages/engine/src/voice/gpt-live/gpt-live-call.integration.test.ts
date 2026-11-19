import { afterEach, describe, expect, it } from 'vitest';
import {
  delegationCreated,
  delegationItem,
  personMoreWords,
  personSaid,
  personTurnDone,
  personTurnGrows,
  personTurnId,
  personTurnOpens,
  personWords,
  sessionStarted,
  usageUpdated,
  voiceMoreWords,
  voiceSaid,
  voiceTurnDone,
  voiceTurnGrows,
  voiceTurnId,
  voiceTurnOpens,
  voiceWords,
} from '#mocks/gpt-live-frames';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';
import type { VoiceProviderEvent } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

// A started call, with everything it reports from now on.
async function listening(): Promise<{
  send: (...frames: string[]) => void;
  sendAudio: (frame: string) => void;
  events: VoiceProviderEvent[];
}> {
  const started = await startedCall();
  fixture = started;
  const { endpoint } = started;

  return {
    send: (...frames) => {
      for (const frame of frames) endpoint.send(frame);
    },
    sendAudio: (frame) => endpoint.sendAudio(Buffer.from(frame)),
    events: heard(started.call),
  };
}

const person = (id: string, text: string, final: boolean) =>
  ({ type: 'person.transcript', id, text, final }) as const;

const voice = (id: string, text: string, final: boolean) =>
  ({ type: 'voice.transcript', id, text, final }) as const;

const personChunk = 'item_ElnYl1s1aVXniJngfZ2Sz';

const voiceChunk = 'item_ElnYp73GvhRUuMawnfzrq';

const typesOf = (events: VoiceProviderEvent[]): string[] =>
  events.map(({ type }) => type);

describe('GPT-Live call events', () => {
  it('reports the call connected', async () => {
    const { send, events } = await listening();

    send(sessionStarted);

    await expect
      .poll(() => events)
      .toEqual([{ type: 'status', status: 'connected' }]);
  });

  it('reports the person’s words as they come, then the whole utterance when their turn is done', async () => {
    const { send, events } = await listening();

    send(
      personWords,
      personTurnOpens,
      personMoreWords,
      personTurnGrows,
      personTurnDone,
    );

    await expect.poll(() => events.length).toBe(3);
    expect(events).toEqual([
      person(personChunk, 'Hi, please', false),
      person(personChunk, 'Hi, please list', false),
      person(personTurnId, personSaid, true),
    ]);
  });

  it('reports the voice speaking and its words, then what it said when its turn is done', async () => {
    const { send, events } = await listening();

    send(voiceWords, voiceMoreWords, voiceTurnOpens, voiceTurnGrows);
    send(voiceTurnDone);

    await expect.poll(() => events.length).toBe(5);
    expect(events).toEqual([
      voice(voiceChunk, 'Okay', false),
      voice(voiceChunk, 'Okay,', false),
      { type: 'speaking', speaking: true },
      voice(voiceTurnId, voiceSaid, true),
      { type: 'speaking', speaking: false },
    ]);
  });

  it('starts the next utterance afresh once a turn is done', async () => {
    const { send, events } = await listening();

    send(personWords, personTurnDone, personMoreWords);

    await expect
      .poll(() => events.at(-1))
      .toEqual(person('item_ElnYlzPXvOktphQ09kM3T', 'list', false));
  });

  it('reports work the voice hands over under its delegation item', async () => {
    const { send, events } = await listening();

    send(delegationCreated);

    await expect
      .poll(() => events)
      .toEqual([
        { type: 'work.requested', requestId: delegationItem, text: personSaid },
      ]);
  });

  it('drops audio frames unread, even one whose bytes read as an event, and usage that counts no tokens', async () => {
    const { send, sendAudio, events } = await listening();

    sendAudio(sessionStarted);
    sendAudio(delegationCreated);
    send(usageUpdated, delegationCreated);

    await expect.poll(() => typesOf(events)).toEqual(['work.requested']);
  });

  it('reports the provider closing the call', async () => {
    const { send, events } = await listening();

    send('{"type":"session.closed"}');

    await expect
      .poll(() => events)
      .toEqual([
        { type: 'trail', note: 'session.closed {}' },
        {
          type: 'closed',
          reason: 'ended',
          why: 'GPT-Live ended the call without saying why.',
        },
      ]);
  });
});
