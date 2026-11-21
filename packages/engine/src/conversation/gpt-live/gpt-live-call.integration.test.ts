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
import type { ConversationProviderEvent } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

// A started call, with everything it reports from now on.
async function listening(): Promise<{
  send: (...frames: string[]) => void;
  sendAudio: (frame: string) => void;
  events: ConversationProviderEvent[];
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

const typesOf = (events: ConversationProviderEvent[]): string[] =>
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

    await expect.poll(() => events.length).toBe(4);
    expect(events).toEqual([
      person(personTurnId, 'Hi, please', false),
      person(personTurnId, 'Hi, please list', false),
      person(personTurnId, personSaid, true),
      { type: 'person.turn.completed', id: personTurnId, text: personSaid },
    ]);
  });

  it('reports the voice speaking and its words, then what it said when its turn is done', async () => {
    const { send, events } = await listening();

    send(voiceWords, voiceMoreWords, voiceTurnOpens, voiceTurnGrows);
    send(voiceTurnDone);

    await expect.poll(() => events.length).toBe(5);
    expect(events).toEqual([
      voice(voiceTurnId, 'Okay', false),
      { type: 'speaking', speaking: true },
      voice(voiceTurnId, 'Okay,', false),
      voice(voiceTurnId, voiceSaid, true),
      { type: 'speaking', speaking: false },
    ]);
  });

  it('shows no words before their turn opens, and none after it is done', async () => {
    const { send, events } = await listening();

    send(personWords, personTurnDone, personMoreWords, personTurnGrows);
    await expect.poll(() => events.length).toBe(2);

    expect(events).toEqual([
      person(personTurnId, personSaid, true),
      { type: 'person.turn.completed', id: personTurnId, text: personSaid },
    ]);
  });

  it("reports work the voice hands over under its delegation item, naming the person's turn it heard", async () => {
    const { send, events } = await listening();

    send(delegationCreated);

    await expect
      .poll(() => events)
      .toEqual([
        {
          type: 'work.requested',
          requestId: delegationItem,
          text: personSaid,
          turnId: personTurnId,
        },
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
