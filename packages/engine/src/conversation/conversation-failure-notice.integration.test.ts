import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createActor, fromCallback, type Actor } from 'xstate';
import { start } from '#mocks/conversation-events';
import type { RelayInput } from './agent-relay-actor';
import {
  providerEvent,
  type ConversationEvent,
  type ConversationInput,
} from './conversation-types';
import {
  type ConnectionWatch,
  type SessionWatch,
} from './conversation-watchers';
import { conversationMachine } from './conversation.machine';
import { FakeConversationProvider } from './fake-provider';
import type { ProviderCallInput } from './provider-call';
import type { ConversationSessions } from './session-link';

// The actors that would send events back are stubs: a test sends every event itself, and the machine's own rules decide.
const stub = <Input>(): ReturnType<
  typeof fromCallback<ConversationEvent, Input>
> => fromCallback<ConversationEvent, Input>((): (() => void) => (): void => {});

const machine = conversationMachine.provide({
  actors: {
    providerCall: stub<ProviderCallInput>(),
    agentRelay: stub<RelayInput>(),
    watchSession: stub<SessionWatch>(),
    watchConnection: stub<ConnectionWatch>(),
  },
});

const input: ConversationInput = {
  provider: new FakeConversationProvider(),
  briefing: () => '',
  idleMs: 60_000,
  log: () => {},
  now: Date.now,
  sessionOpen: () => true,
};

let voice: Actor<typeof machine>;

afterEach(() => voice?.stop());

// Sessions whose Feed is a spy: every Notice written into it is a call to `notice`.
type SpySessions = {
  sessions: ConversationSessions;
  notice: Mock<ConversationSessions['notice']>;
};

function spySessions(): SpySessions {
  const notice = vi.fn<ConversationSessions['notice']>();

  const sessions: ConversationSessions = {
    prompt: () => Promise.reject(new Error('No Prompts in this test')),
    stop: () => Promise.resolve(false),
    watch: () => (): void => {},
    notice,
    capture: () => Promise.reject(new Error('No capture in this test')),
  };

  return { sessions, notice };
}

// A running call whose Session is a spy.
function runningCall(): Mock<ConversationSessions['notice']> {
  const { sessions, notice } = spySessions();
  voice = createActor(machine, { input }).start();
  voice.send({ type: 'sessions.attach', sessions });
  voice.send(start);

  return notice;
}

describe('the Notice a failed call leaves', () => {
  it('is one when a start failure and a provider error arrive back to back', () => {
    const notice = runningCall();
    voice.send({ type: 'call.failed', message: 'The provider refused' });
    voice.send(providerEvent({ type: 'status', status: 'error' }));
    voice.send(providerEvent({ type: 'closed', reason: 'error' }));

    expect(notice).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenCalledWith(
      start.sessionId,
      expect.objectContaining({ title: 'Conversation failed' }),
    );
  });

  it('is one when a provider error and a close with error arrive back to back', () => {
    const notice = runningCall();
    voice.send(providerEvent({ type: 'status', status: 'error' }));
    voice.send(providerEvent({ type: 'closed', reason: 'error' }));
    voice.send({ type: 'call.failed', message: 'Late' });

    expect(notice).toHaveBeenCalledTimes(1);
  });

  it('is none when the person ends the call', () => {
    const notice = runningCall();
    voice.send({ type: 'call.end', reason: 'person' });

    expect(notice).not.toHaveBeenCalled();
  });
});

describe('Sessions attached while a call runs', () => {
  it('receive the Notice of a call the provider closes for a reached limit', () => {
    runningCall();
    const attached = spySessions();
    voice.send({ type: 'sessions.attach', sessions: attached.sessions });

    voice.send(providerEvent({ type: 'closed', reason: 'limit' }));

    expect(attached.notice).toHaveBeenCalledWith(
      start.sessionId,
      expect.objectContaining({
        title: 'Conversation ended: usage limit reached',
      }),
    );
  });
});
