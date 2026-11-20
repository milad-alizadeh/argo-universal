import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type {
  SessionUpdate,
  Conversation,
  ConversationStatus,
} from '@repo/contracts';
import { heldPrompt } from '@repo/mocks/agent/cancellable-scenarios';
import { FakeConversationProvider } from '../src/conversation/fake-provider';
import type { ConversationProviderEvent } from '../src/conversation/provider';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { openAccessSession, sessionIdentityStep } from './session-access';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

export type ConversationSession = Awaited<ReturnType<typeof openAccessSession>>;

export const offer = 'offer-sdp';

type ConversationEngineParts = {
  host: Host;
  provider: FakeConversationProvider;
  outputs: TerminalOutputResponse[];
};

/*
 * The Engine with the mock ACP Agent and a fake Conversation provider whose call connects only when a test says so.
 * `restartOver` starts the Engine again over a stopped one's home, with what it stored.
 */
export async function startConversationEngine(
  provider: FakeConversationProvider = new FakeConversationProvider({
    connect: 'manual',
  }),
  restartOver?: string,
): Promise<ConversationEngineParts> {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    steps: [sessionIdentityStep(outputs)],
    conversationProvider: provider,
    restartOver,
  });

  return { host, provider, outputs };
}

// A settled Session, with the caller its Agent has.
export const openConversationSession = (
  voice: Awaited<ReturnType<typeof startConversationEngine>>,
  text = 'Hello',
): Promise<ConversationSession> => openAccessSession(voice, text);

export const callOf = async (host: Host): Promise<Conversation | null> =>
  (await host.caller.conversation.status()).conversation;

export const endedOf = async (
  host: Host,
): Promise<ConversationStatus['ended']> =>
  (await host.caller.conversation.status()).ended;

type ConversationEngine = Awaited<ReturnType<typeof startConversationEngine>>;

// What a speaker says; words not `final` may still change.
export const said = {
  person: (
    id: string,
    text: string,
    final: boolean,
  ): ConversationProviderEvent => ({
    type: 'person.transcript',
    id,
    text,
    final,
  }),
  voice: (
    id: string,
    text: string,
    final: boolean,
  ): ConversationProviderEvent => ({
    type: 'voice.transcript',
    id,
    text,
    final,
  }),
};

// The provider reports it on the running call.
export const say = (
  voice: ConversationEngine,
  event: ConversationProviderEvent,
): void => voice.provider.call.emit(event);

export const partialsOf = async (
  host: Host,
): Promise<ConversationStatus['partials']> =>
  (await host.caller.conversation.status()).partials;

// A Session with a running, connected call.
export async function startedCall(voice: ConversationEngine): Promise<string> {
  const { sessionId } = await openConversationSession(voice);
  await voice.host.caller.conversation.start({ sessionId, offer });
  voice.provider.call.connect();

  return sessionId;
}

// The Session's newest stored Feed rows, oldest first.
export const storedRows = async (
  host: Host,
  sessionId: string,
): Promise<SessionUpdate[]> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows;

const textOf = (row: SessionUpdate): string =>
  'content' in row
    ? row.content.map((block) => ('text' in block ? block.text : '')).join('')
    : '';

// Only the transcript rows, as a test reads them: the kind and the words said.
export const transcriptsOf = async (
  host: Host,
  sessionId: string,
): Promise<{ kind: string; text: string }[]> =>
  (await storedRows(host, sessionId))
    .filter((row) => row.sessionUpdate.endsWith('_transcript'))
    .map((row) => ({ kind: row.sessionUpdate, text: textOf(row) }));

export { heldPrompt };

// The Agent holds the Turn of `heldPrompt` open until it is cancelled.
const heldScenario = {
  steps: [],
  responses: {
    'session/prompt': [
      { prompt: heldPrompt, steps: [{ type: 'wait-for-cancel' as const }] },
      {},
    ],
  },
};

// An Engine with a Session open and a connected call on it, whose Agent can be made to hold a Turn.
export async function startCallInHeldSession(): Promise<{
  voice: ConversationEngine;
  sessionId: string;
}> {
  const provider = new FakeConversationProvider({ connect: 'manual' });

  const host = await startAcpEngine({
    ...heldScenario,
    conversationProvider: provider,
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);

  await host.caller.conversation.start({ sessionId, offer });
  provider.call.connect();

  return { voice: { host, provider, outputs: [] }, sessionId };
}
