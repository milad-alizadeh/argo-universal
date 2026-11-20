import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  callOf,
  endedOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { FakeConversationProvider } from './fake-provider';

// A call running in a settled Session, and what ends it.
async function runningCall(): Promise<
  Awaited<ReturnType<typeof startConversationEngine>> & { sessionId: string }
> {
  const voice = await startConversationEngine();
  const { sessionId } = await openConversationSession(voice);
  await voice.host.caller.conversation.start({ sessionId, offer });

  return { ...voice, sessionId };
}

describe('Conversation endings', () => {
  it('ends when the provider closes the call', async () => {
    const { host, provider } = await runningCall();
    provider.call.close('ended');
    await expect
      .poll(() => host.caller.conversation.status())
      .toMatchObject({
        call: null,
        ended: { reason: 'provider-closed' },
      });
  });

  it('ends as failed when the provider reports an error', async () => {
    const { host, provider } = await runningCall();
    provider.call.emit({ type: 'status', status: 'error' });
    await expect
      .poll(() => host.caller.conversation.status())
      .toMatchObject({
        call: null,
        ended: { reason: 'failed' },
      });
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
    await expect
      .poll(() => host.caller.conversation.status())
      .toMatchObject({
        call: null,
        ended: { reason: 'session-archived' },
      });
    expect(provider.call.ended).toBe(true);
  });

  it('ends when the App that started it disconnects', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);
    const connection = new AbortController();
    const app = host.createCaller({ signal: connection.signal });
    await app.conversation.start({ sessionId, offer });
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
      conversationProvider: new FakeConversationProvider(),
    });

    expect(await callOf(restarted)).toBeNull();
  });
});
