import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { runOperation } from '#mocks/operations';
import {
  callOf,
  endedOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';
import { FakeVoiceProvider } from './fake-provider';

const signInReason = 'Sign in to Codex';

describe('Voice call', () => {
  it('starts a call that is connecting, then connected, and ends when the person ends it', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const { sessionId } = await openVoiceSession(voice);

    const started = await host.caller.voice.start({ sessionId, offer });
    expect(started.answer).toBe(`fake-answer:${offer}`);
    expect(await callOf(host)).toMatchObject({
      sessionId,
      status: 'connecting',
    });
    provider.call.connect();
    await expect
      .poll(() => callOf(host))
      .toMatchObject({ status: 'connected' });

    expect(await host.caller.voice.end({ sessionId })).toEqual({ ended: true });
    expect(await host.caller.voice.status()).toMatchObject({
      call: null,
      ended: { sessionId, reason: 'person' },
    });
    expect(provider.call.ended).toBe(true);
  });

  it('tells the voice which Session it speaks for', async () => {
    const voice = await startVoiceEngine();
    const { sessionId } = await openVoiceSession(voice);
    await voice.host.caller.voice.start({ sessionId, offer });
    expect(voice.provider.call.request).toMatchObject({
      offer,
      briefing: expect.stringContaining('Session:'),
    });
  });

  it('reports no usable provider, and starts no call', async () => {
    const voice = await startVoiceEngine(
      new FakeVoiceProvider({ usable: false, reason: signInReason }),
    );

    const { host } = voice;
    const { sessionId } = await openVoiceSession(voice);

    expect((await host.caller.voice.status()).availability).toEqual({
      usable: false,
      reason: signInReason,
    });
    await expect(host.caller.voice.start({ sessionId, offer })).rejects.toThrow(
      signInReason,
    );
    expect(await callOf(host)).toBeNull();
  });

  it('reports no usable provider when the Server has none', async () => {
    const host = await startAcpEngine({ steps: [] });
    expect((await host.caller.voice.status()).availability.usable).toBe(false);
  });

  it('refuses a second call while one is running, in the same or another Session', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const first = await openVoiceSession(voice);
    const second = await openVoiceSession(voice);
    await host.caller.voice.start({ sessionId: first.sessionId, offer });
    await expect(
      host.caller.voice.start({ sessionId: second.sessionId, offer }),
    ).rejects.toThrow('already running');
    await expect(
      host.caller.voice.start({ sessionId: first.sessionId, offer }),
    ).rejects.toThrow('already running');
    expect(provider.calls).toHaveLength(1);
    expect(await callOf(host)).toMatchObject({ sessionId: first.sessionId });
  });

  it('starts a call again after one ended', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const { sessionId } = await openVoiceSession(voice);
    await host.caller.voice.start({ sessionId, offer });
    await host.caller.voice.end({ sessionId });
    await host.caller.voice.start({ sessionId, offer });
    expect(provider.calls).toHaveLength(2);
    expect(await callOf(host)).toMatchObject({ sessionId });
  });

  it('ends only the Session whose call it names', async () => {
    const voice = await startVoiceEngine();
    const { host } = voice;
    const { sessionId } = await openVoiceSession(voice);
    const other = await openVoiceSession(voice);
    await host.caller.voice.start({ sessionId, offer });
    expect(await host.caller.voice.end({ sessionId: other.sessionId })).toEqual(
      { ended: false },
    );
    expect(await callOf(host)).toMatchObject({ sessionId });
  });

  it('lets an Agent end its own Session’s call as an Operation', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const session = await openVoiceSession(voice);
    await host.caller.voice.start({ sessionId: session.sessionId, offer });
    expect(
      await runOperation(session.caller.operations, {
        id: 'voice.end',
        params: {},
        wait: true,
      }),
    ).toEqual({ ended: true });
    expect(provider.call.ended).toBe(true);
  });

  it('fails a start the provider cannot make', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const { sessionId } = await openVoiceSession(voice);
    provider.configure({ failStart: 'The service said no' });
    await expect(host.caller.voice.start({ sessionId, offer })).rejects.toThrow(
      'The service said no',
    );
    expect(await callOf(host)).toBeNull();
    expect(await endedOf(host)).toMatchObject({ reason: 'failed' });
  });
});
