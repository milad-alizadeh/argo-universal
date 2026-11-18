import { afterEach, describe, expect, it } from 'vitest';
import {
  startFakeEndpoint,
  type FakeGptLiveEndpoint,
} from '#mocks/gpt-live-endpoint';
import type { VoiceProviderEvent } from '../provider';
import type { CodexAuth, CodexReading } from './codex-auth';
import { createGptLiveProvider } from './gpt-live-provider';

// A Codex that hands out these tokens in turn, and counts how often it was asked.
class ScriptedAuth implements CodexAuth {
  public asked = 0;

  public constructor(private readonly readings: CodexReading[]) {}

  public read(): Promise<CodexReading> {
    const reading = this.readings.at(Math.min(this.asked, this.readings.length - 1));
    this.asked += 1;

    return Promise.resolve(reading ?? { signedIn: false, reason: 'No reading' });
  }
}

const signedIn = (token: string): CodexReading => ({ signedIn: true, token });

let endpoint: FakeGptLiveEndpoint | undefined;

afterEach(async () => {
  await endpoint?.close();
  endpoint = undefined;
});

async function setup(
  readings: CodexReading[],
  accepts: string[],
): Promise<{
  endpoint: FakeGptLiveEndpoint;
  auth: ScriptedAuth;
  provider: ReturnType<typeof createGptLiveProvider>;
}> {
  const fake = await startFakeEndpoint({ accepts });
  endpoint = fake;
  const auth = new ScriptedAuth(readings);
  const provider = createGptLiveProvider({
    auth,
    callsUrl: `${fake.httpBase}/backend-api/codex/realtime/calls`,
    linkUrl: `${fake.linkBase}/v1/live`,
    lostLinkMs: 150,
  });

  return { endpoint: fake, auth, provider };
}

const request = { offer: 'v=0 offer', briefing: 'Session: Fix the build' };

const heard = (call: { listen: (l: (e: VoiceProviderEvent) => void) => unknown }): VoiceProviderEvent[] => {
  const events: VoiceProviderEvent[] = [];
  call.listen((event) => events.push(event));

  return events;
};

describe('GPT-Live provider', () => {
  it('creates a call with the token, the offer and the alpha header, then joins the control link', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);

    const call = await provider.start(request);

    expect(call.answer).toBe('v=0 answer');
    expect(fake.created).toHaveLength(1);
    expect(fake.created[0]).toMatchObject({
      authorization: 'Bearer t1',
      alpha: 'quicksilver=v2',
    });
    expect(fake.created[0]?.url).toContain('intent=quicksilver&architecture=avas');
    expect(fake.created[0]?.body).toContain('v=0 offer');
    expect(fake.created[0]?.body).toContain('gpt-live-1.1-codex');
    expect(fake.created[0]?.body).toContain('Session: Fix the build');
    expect(fake.linkTokens).toEqual(['t1']);
    expect(fake.links).toHaveLength(1);
  });

  it('reports the call connected, what was said, work asked for and usage', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);
    const call = await provider.start(request);
    const events = heard(call);

    fake.send({ type: 'session.started' });
    fake.send({ type: 'input_transcript.added', id: 'i1', transcript: 'fix the build' });
    fake.send({ type: 'output_transcript.added', id: 'o1', transcript: 'On it' });
    fake.send({ type: 'delegation.created', delegation_id: 'd1', text: 'fix the build' });
    fake.send({ type: 'session.usage.updated', usage: { input_tokens: 12, output_tokens: 34 } });

    await expect.poll(() => events.length).toBe(5);
    expect(events).toEqual([
      { type: 'status', status: 'connected' },
      { type: 'person.transcript', id: 'i1', text: 'fix the build', final: true },
      { type: 'voice.transcript', id: 'o1', text: 'On it', final: true },
      { type: 'work.requested', requestId: 'd1', text: 'fix the build' },
      { type: 'usage', inputTokens: 12, outputTokens: 34 },
    ]);
  });

  it('answers a request and speaks unprompted, and says close when the call ends', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);
    const call = await provider.start(request);

    call.reply('d1', 'Done', 'speak');
    call.tell('Tests are failing', 'background');
    call.end();
    call.end();

    await expect.poll(() => fake.received.length).toBe(3);
    expect(fake.received).toEqual([
      { type: 'delegation.context.append', delegation_id: 'd1', channel: 'speakable', text: 'Done' },
      { type: 'session.context.append', channel: 'commentary', text: 'Tests are failing' },
      { type: 'session.close' },
    ]);
  });

  it('drops audio frames unread', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);
    const call = await provider.start(request);
    const events = heard(call);

    fake.sendAudio();
    fake.sendAudio();
    fake.send({ type: 'session.started' });

    await expect.poll(() => events).toEqual([{ type: 'status', status: 'connected' }]);
  });

  it('asks Codex for a new token once when the first is rejected', async () => {
    const { endpoint: fake, auth, provider } = await setup(
      [signedIn('stale'), signedIn('fresh')],
      ['fresh'],
    );

    const call = await provider.start(request);

    expect(call.answer).toBe('v=0 answer');
    expect(auth.asked).toBe(2);
    expect(fake.created.map((created) => created.authorization)).toEqual([
      'Bearer stale',
      'Bearer fresh',
    ]);
  });

  it('fails the start when the second token is rejected too, asking no third time', async () => {
    const { auth, provider } = await setup([signedIn('bad1'), signedIn('bad2')], ['good']);

    await expect(provider.start(request)).rejects.toThrow(/rejected/i);
    expect(auth.asked).toBe(2);
  });

  it('is unusable, with the reason, when Codex is not signed in with ChatGPT', async () => {
    const { auth, provider } = await setup(
      [{ signedIn: false, reason: 'Sign in to Codex with ChatGPT' }],
      [],
    );

    expect(await provider.availability()).toEqual({
      usable: false,
      reason: 'Sign in to Codex with ChatGPT',
    });
    await expect(provider.start(request)).rejects.toThrow('Sign in to Codex with ChatGPT');
    expect(auth.asked).toBe(2);
  });

  it('is usable when Codex holds a ChatGPT token', async () => {
    const { provider } = await setup([signedIn('t1')], ['t1']);

    expect(await provider.availability()).toEqual({ usable: true });
  });

  it('ends the call as lost when the control link stays down past the grace period', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);
    const call = await provider.start(request);
    const events = heard(call);

    fake.refuseLinks = true;
    fake.dropLink();
    await expect.poll(() => events.at(-1)).toEqual({ type: 'closed', reason: 'lost' });
    expect(events[0]).toEqual({ type: 'status', status: 'disconnected' });
  });

  it('keeps the call when the control link comes back within the grace period', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);
    const call = await provider.start(request);
    const events = heard(call);

    fake.dropLink();
    await expect.poll(() => fake.links.length).toBe(2);
    fake.send({ type: 'session.started' });
    await expect
      .poll(() => events.at(-1))
      .toEqual({ type: 'status', status: 'connected' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(events.some((event) => event.type === 'closed')).toBe(false);
  });

  it('reports the provider closing the call', async () => {
    const { endpoint: fake, provider } = await setup([signedIn('t1')], ['t1']);
    const call = await provider.start(request);
    const events = heard(call);

    fake.send({ type: 'session.closed' });

    await expect.poll(() => events).toEqual([{ type: 'closed', reason: 'ended' }]);
  });
});
