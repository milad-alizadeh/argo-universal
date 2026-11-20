import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { closeTestSession } from '#mocks/close-session';
import {
  callOf,
  endedOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { FakeConversationProvider } from './fake-provider';

const signInReason = 'Sign in to Codex';

describe('Conversation', () => {
  it('starts a call that is connecting, then connected, and ends when the person ends it', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);

    const started = await host.caller.conversation.start({ sessionId, offer });
    expect(started.answer).toBe(`fake-answer:${offer}`);
    expect(await callOf(host)).toMatchObject({
      sessionId,
      status: 'connecting',
    });
    provider.call.connect();
    await expect
      .poll(() => callOf(host))
      .toMatchObject({ status: 'connected' });

    expect(await host.caller.conversation.end({ sessionId })).toEqual({
      ended: true,
    });
    expect(await host.caller.conversation.status()).toMatchObject({
      conversation: null,
      ended: { sessionId, reason: 'person' },
    });
    expect(provider.call.ended).toBe(true);
  });

  it('opens a Session that is not open, as after a Server restart, and starts the call in it', async () => {
    const voice = await startConversationEngine();
    const { host } = voice;
    const { sessionId } = await openConversationSession(voice);
    await closeTestSession(host, { sessionId });

    await host.caller.conversation.start({ sessionId, offer });

    expect(await callOf(host)).toMatchObject({ sessionId });
  });

  it('refuses a Session that does not exist, and starts no call', async () => {
    const { host, provider } = await startConversationEngine();

    await expect(
      host.caller.conversation.start({ sessionId: 'no-such-session', offer }),
    ).rejects.toThrow('No Session no-such-session');
    expect(provider.calls).toHaveLength(0);
    expect(await callOf(host)).toBeNull();
  });

  it('tells the voice which Session it speaks for', async () => {
    const voice = await startConversationEngine();
    const { sessionId } = await openConversationSession(voice);
    await voice.host.caller.conversation.start({ sessionId, offer });
    expect(voice.provider.call.request).toMatchObject({
      offer,
      briefing: expect.stringContaining('Session:'),
    });
  });

  it('reports no usable provider, and starts no call', async () => {
    const voice = await startConversationEngine(
      new FakeConversationProvider({ usable: false, reason: signInReason }),
    );

    const { host } = voice;
    const { sessionId } = await openConversationSession(voice);

    expect((await host.caller.conversation.status()).availability).toEqual({
      usable: false,
      reason: signInReason,
    });
    await expect(
      host.caller.conversation.start({ sessionId, offer }),
    ).rejects.toThrow(signInReason);
    expect(await callOf(host)).toBeNull();
  });

  it('reports no usable provider when the Server has none', async () => {
    const host = await startAcpEngine({ steps: [] });
    expect((await host.caller.conversation.status()).availability.usable).toBe(
      false,
    );
  });

  it('refuses a second call while one is running, in the same or another Session', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const first = await openConversationSession(voice);
    const second = await openConversationSession(voice);
    await host.caller.conversation.start({ sessionId: first.sessionId, offer });
    await expect(
      host.caller.conversation.start({ sessionId: second.sessionId, offer }),
    ).rejects.toThrow('already running');
    await expect(
      host.caller.conversation.start({ sessionId: first.sessionId, offer }),
    ).rejects.toThrow('already running');
    expect(provider.calls).toHaveLength(1);
    expect(await callOf(host)).toMatchObject({ sessionId: first.sessionId });
  });

  it('starts a call again after one ended', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);
    await host.caller.conversation.start({ sessionId, offer });
    await host.caller.conversation.end({ sessionId });
    await host.caller.conversation.start({ sessionId, offer });
    expect(provider.calls).toHaveLength(2);
    expect(await callOf(host)).toMatchObject({ sessionId });
  });

  it('ends only the Session whose call it names', async () => {
    const voice = await startConversationEngine();
    const { host } = voice;
    const { sessionId } = await openConversationSession(voice);
    const other = await openConversationSession(voice);
    await host.caller.conversation.start({ sessionId, offer });
    expect(
      await host.caller.conversation.end({ sessionId: other.sessionId }),
    ).toEqual({ ended: false });
    expect(await callOf(host)).toMatchObject({ sessionId });
  });

  it('fails a start the provider cannot make', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);
    provider.configure({ failStart: 'The service said no' });
    await expect(
      host.caller.conversation.start({ sessionId, offer }),
    ).rejects.toThrow('The service said no');
    expect(await callOf(host)).toBeNull();
    expect(await endedOf(host)).toMatchObject({ reason: 'failed' });
  });
});
