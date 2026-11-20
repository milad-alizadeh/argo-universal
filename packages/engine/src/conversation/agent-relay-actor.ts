import { fromCallback } from 'xstate';
import { AgentRelay, type RelayReports } from './agent-relay';
import type {
  SendBack,
  ConversationEvent,
  VoiceSay,
} from './conversation-types';
import type { ConversationSessions } from './session-link';

export type RelayInput = {
  sessions: ConversationSessions;
  sessionId: string;
};

type WorkRequest = { requestId: string; text: string };

const workRequestOf = (event: ConversationEvent): WorkRequest | undefined =>
  event.type === 'provider.event' && event.event.type === 'work.requested'
    ? event.event
    : undefined;

const reportsTo = (sendBack: SendBack): RelayReports => ({
  speak: (say: VoiceSay): void => sendBack({ type: 'voice.say', say }),
  turnsRunning: (running: boolean): void =>
    sendBack({ type: 'call.turns', running }),
});

/*
 * The go-between of one Conversation and its Session. The machine forwards the person's requests for work to it; it sends
 * back what the voice should be told, as `voice.say`.
 */
export const agentRelay = fromCallback<ConversationEvent, RelayInput>(
  ({ input, sendBack, receive }) => {
    const { sessions } = input;

    const relay = new AgentRelay(sessions, input, reportsTo(sendBack));

    receive((event) => {
      const request = workRequestOf(event);

      if (request) void relay.request(request.requestId, request.text);
    });

    return sessions.watch(input.sessionId, (happening) =>
      relay.happened(happening),
    );
  },
);
