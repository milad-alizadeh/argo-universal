import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  callOf,
  endedOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';
import { FakeVoiceProvider } from './fake-provider';

// A call running in a settled Session, and what ends it.
async function runningCall(): Promise<
  Awaited<ReturnType<typeof startVoiceEngine>> & { sessionId: string }
> {
  const voice = await startVoiceEngine();
  const { sessionId } = await openVoiceSession(voice);
  await voice.host.caller.voice.start({ sessionId, offer });

  return { ...voice, sessionId };
}

describe('Voice call endings', () => {
  it('ends when the provider closes the call', async () => {
    const { host, provider } = await runningCall();
    provider.call.close('ended');
    await expect
      .poll(() => endedOf(host))
      .toMatchObject({
        reason: 'provider-closed',
      });
    expect(await callOf(host)).toBeNull();
  });

  it('ends as failed when the provider reports an error', async () => {
    const { host, provider } = await runningCall();
    provider.call.emit({ type: 'status', status: 'error' });
    await expect.poll(() => endedOf(host)).toMatchObject({ reason: 'failed' });
    expect(provider.call.ended).toBe(true);
  });

  it('ends when its Session is closed', async () => {
    const { host, provider, sessionId } = await runningCall();
    await host.caller.session.close({ sessionId });
    await expect.poll(() => callOf(host)).toBeNull();
    expect(provider.call.ended).toBe(true);
    expect(await endedOf(host)).toMatchObject({ reason: 'session-closed' });
  });

  it('ends when its Session is archived', async () => {
    const { host, provider, sessionId } = await runningCall();
    await host.caller.session.archive({ sessionId });
    await expect.poll(() => callOf(host)).toBeNull();
    expect(provider.call.ended).toBe(true);
  });

  it('ends when the App that started it disconnects', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const { sessionId } = await openVoiceSession(voice);
    const connection = new AbortController();
    const app = host.createCaller({ signal: connection.signal });
    await app.voice.start({ sessionId, offer });
    connection.abort();
    await expect.poll(() => callOf(host)).toBeNull();
    expect(provider.call.ended).toBe(true);
    expect(await endedOf(host)).toMatchObject({ reason: 'app-disconnected' });
  });

  it('ends when the Engine stops, and a restarted Engine has no call', async () => {
    const { host, provider } = await runningCall();
    await host.stop();
    expect(provider.call.ended).toBe(true);

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: host.home,
      voiceProvider: new FakeVoiceProvider(),
    });

    expect(await callOf(restarted)).toBeNull();
  });
});
