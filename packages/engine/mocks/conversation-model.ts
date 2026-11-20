import { fromCallback } from 'xstate';
import type { ConversationEvent, ConversationInput } from '../src/conversation/conversation-types';
import type { ConnectionWatch, SessionWatch } from '../src/conversation/conversation-watchers';
import { conversationMachine } from '../src/conversation/conversation.machine';
import { FakeConversationProvider } from '../src/conversation/fake-provider';
import type { ProviderCallInput } from '../src/conversation/provider-call';

const stub = <Input>(): ReturnType<
  typeof fromCallback<ConversationEvent, Input>
> => fromCallback<ConversationEvent, Input>((): (() => void) => (): void => {});

// The Conversation machine with the actors that would send events back stubbed, so a test sends every event itself.
export const modelMachine = conversationMachine.provide({
  actors: {
    providerCall: stub<ProviderCallInput>(),
    watchSession: stub<SessionWatch>(),
    watchConnection: stub<ConnectionWatch>(),
  },
});

export const voiceModelIdleMs = 60_000;

// A fresh input for each actor, so no two tests share one provider.
export const voiceModelInput = (): ConversationInput => ({
  provider: new FakeConversationProvider(),
  briefing: () => '',
  idleMs: voiceModelIdleMs,
  log: () => {},
  now: Date.now,
  sessionOpen: () => true,
});
