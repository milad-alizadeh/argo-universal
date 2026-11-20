import { fromCallback } from 'xstate';
import { AgentRelay, type RelayReports } from './agent-relay';
import type {
  SendBack,
  ConversationEvent,
  VoiceSay,
} from './conversation-types';
import type { ConversationProviderEvent } from './provider';
import type { ConversationSessions } from './session-link';

export type RelayInput = {
  sessions: ConversationSessions;
  sessionId: string;
};

type Heard = Extract<
  ConversationProviderEvent,
  { type: 'work.requested' | 'person.transcript' }
>;

const relayed = new Set<ConversationProviderEvent['type']>([
  'work.requested',
  'person.transcript',
]);

const isHeard = (event: ConversationProviderEvent): event is Heard =>
  relayed.has(event.type);

const heardOf = (event: ConversationEvent): Heard | undefined =>
  event.type === 'provider.event' && isHeard(event.event)
    ? event.event
    : undefined;

const tell = (relay: AgentRelay, heard: Heard): void => {
  if (heard.type === 'person.transcript') return relay.personSaid(heard);
  void relay.request(heard.requestId, heard.text, heard.turnId);
};

const reportsTo = (sendBack: SendBack): RelayReports => ({
  speak: (say: VoiceSay): void => sendBack({ type: 'voice.say', say }),
  turnsRunning: (running: boolean): void =>
    sendBack({ type: 'call.turns', running }),
});

/*
 * The go-between of one Conversation and its Session. The machine forwards the person's requests for work and words to it; it sends
 * back what the voice should be told, as `voice.say`.
 */
export const agentRelay = fromCallback<ConversationEvent, RelayInput>(
  ({ input, sendBack, receive }) => {
    const { sessions } = input;

    const relay = new AgentRelay(sessions, input, reportsTo(sendBack));

    receive((event) => {
      const heard = heardOf(event);

      if (heard) tell(relay, heard);
    });

    return sessions.watch(input.sessionId, (happening) =>
      relay.happened(happening),
    );
  },
);
