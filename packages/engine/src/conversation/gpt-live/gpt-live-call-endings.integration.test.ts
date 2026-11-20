import { afterEach, describe, expect, it } from 'vitest';
import {
  sessionClosedFor,
  sessionClosedSilently,
  sessionStartedUntil,
} from '#mocks/gpt-live-frames';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';
import type { ConversationProviderEvent } from '../provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

async function startCall(
  ...options: Parameters<typeof startedCall>
): ReturnType<typeof startedCall> {
  const started = await startedCall(...options);
  fixture = started;

  return started;
}

const closedOf = (events: ConversationProviderEvent[]): ConversationProviderEvent[] =>
  events.filter(({ type }) => type === 'closed');

const notesOf = (events: ConversationProviderEvent[]): string[] =>
  events.flatMap((event) => (event.type === 'trail' ? [event.note] : []));

const inSeconds = (ms: number): number => Math.floor((Date.now() + ms) / 1000);

const hourMs = 3_600_000;

describe('GPT-Live closing a call on its own', () => {
  it('says no audio reached it when it closes an expired call early', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.send(sessionStartedUntil(inSeconds(2 * hourMs)));
    endpoint.send(sessionClosedFor('expired'));

    await expect
      .poll(() => closedOf(events))
      .toEqual([
        {
          type: 'closed',
          reason: 'ended',
          why: 'GPT-Live ended the call because no audio reached it from the App.',
        },
      ]);
    expect(notesOf(events)).toContainEqual(
      expect.stringContaining('session.closed {"reason":"expired"'),
    );
  });

  it('says the call reached its longest when it expires on time', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.send(sessionStartedUntil(inSeconds(0)));
    endpoint.send(sessionClosedFor('expired'));

    await expect
      .poll(() => closedOf(events))
      .toEqual([
        {
          type: 'closed',
          reason: 'ended',
          why: 'GPT-Live ended the call because it reached the longest a GPT-Live call may last.',
        },
      ]);
  });

  it('passes on a reason it does not know, in its own words', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.send(sessionClosedFor('server_shutdown'));

    await expect
      .poll(() => closedOf(events))
      .toEqual([
        {
          type: 'closed',
          reason: 'ended',
          why: 'GPT-Live ended the call and gave the reason “server_shutdown”.',
        },
      ]);
  });

  it('says it gave no reason when it gives none', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.send(sessionClosedSilently);

    await expect
      .poll(() => closedOf(events))
      .toEqual([
        {
          type: 'closed',
          reason: 'ended',
          why: 'GPT-Live ended the call without saying why.',
        },
      ]);
  });

  it('closes for a reached limit when its reason names one', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.send(sessionClosedFor('usage_limit_reached'));

    await expect
      .poll(() => closedOf(events))
      .toEqual([expect.objectContaining({ reason: 'limit' })]);
  });

  it('ends the call at once when it no longer knows the call the link asks for', async () => {
    const { endpoint, call } = await startCall({ lostLinkMs: 20_000 });
    const events = heard(call);

    endpoint.callGone = true;
    endpoint.dropLink();

    await expect
      .poll(() => closedOf(events))
      .toEqual([
        {
          type: 'closed',
          reason: 'ended',
          why: 'GPT-Live ended the call on its side, most likely because the audio between the App and GPT-Live stopped.',
        },
      ]);
    expect(notesOf(events)).toEqual([
      'link closed 1006',
      'rejoin refused: GPT-Live no longer has the call (404)',
    ]);
  });

  it('says the connection was lost when the link stays down', async () => {
    const { endpoint, call } = await startCall({ lostLinkMs: 300 });
    const events = heard(call);

    endpoint.refuseLinks = true;
    endpoint.dropLink();

    await expect
      .poll(() => closedOf(events))
      .toEqual([
        {
          type: 'closed',
          reason: 'lost',
          why: 'The connection to GPT-Live was lost and could not be restored.',
        },
      ]);
  });
});
