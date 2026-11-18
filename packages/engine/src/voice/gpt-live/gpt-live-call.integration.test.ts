import { afterEach, describe, expect, it } from 'vitest';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.endpoint.close();
  fixture = undefined;
});

async function startCall(): ReturnType<typeof startedCall> {
  const started = await startedCall();
  fixture = started;

  return started;
}

const requestText = 'fix the build';

const connected = '{"type":"session.started"}';

const personSaid = JSON.stringify({
  type: 'input_transcript.added',
  id: 'i1',
  transcript: requestText,
});

const voiceSaid = JSON.stringify({
  type: 'output_transcript.added',
  id: 'o1',
  transcript: 'On it',
});

const handedOver = JSON.stringify({
  type: 'delegation.created',
  delegation_id: 'd1',
  text: requestText,
});

const usage = JSON.stringify({
  type: 'session.usage.updated',
  usage: { input_tokens: 12, output_tokens: 34 },
});

describe('GPT-Live call events', () => {
  it('reports the call connected, what was said, work asked for and usage', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    for (const frame of [connected, personSaid, voiceSaid, handedOver, usage])
      endpoint.send(frame);

    await expect.poll(() => events.length).toBe(5);
    expect(events).toEqual([
      { type: 'status', status: 'connected' },
      {
        type: 'person.transcript',
        id: 'i1',
        text: requestText,
        final: true,
      },
      { type: 'voice.transcript', id: 'o1', text: 'On it', final: true },
      { type: 'work.requested', requestId: 'd1', text: requestText },
      { type: 'usage', inputTokens: 12, outputTokens: 34 },
    ]);
  });

  it('drops audio frames unread', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.sendAudio();
    endpoint.sendAudio();
    endpoint.send(connected);

    await expect
      .poll(() => events)
      .toEqual([{ type: 'status', status: 'connected' }]);
  });

  it('reports the provider closing the call', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.send('{"type":"session.closed"}');

    await expect
      .poll(() => events)
      .toEqual([{ type: 'closed', reason: 'ended' }]);
  });
});

describe('GPT-Live call speaking', () => {
  it('answers a request and speaks unprompted, and says close when the call ends', async () => {
    const { endpoint, call } = await startCall();

    call.reply('d1', 'Done', 'speak');
    call.tell('Tests are failing', 'background');
    call.end();
    call.end();

    await expect.poll(() => endpoint.received.length).toBe(3);
    expect(endpoint.received).toEqual([
      {
        type: 'delegation.context.append',
        delegation_id: 'd1',
        channel: 'speakable',
        text: 'Done',
      },
      {
        type: 'session.context.append',
        channel: 'commentary',
        text: 'Tests are failing',
      },
      { type: 'session.close' },
    ]);
  });
});

describe('GPT-Live call losing its link', () => {
  it('ends the call as lost when the control link stays down past the grace period', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.refuseLinks = true;
    endpoint.dropLink();

    await expect
      .poll(() => events.at(-1))
      .toEqual({ type: 'closed', reason: 'lost' });
    expect(events.at(0)).toEqual({ type: 'status', status: 'disconnected' });
  });

  it('keeps the call when the control link comes back within the grace period', async () => {
    const { endpoint, call } = await startCall();
    const events = heard(call);

    endpoint.dropLink();
    await expect.poll(() => endpoint.links.length).toBe(2);
    await expect
      .poll(() => events.at(-1))
      .toEqual({ type: 'status', status: 'connected' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(events.map(({ type }) => type)).not.toContain('closed');
  });
});
