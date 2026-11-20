import { fromCallback } from 'xstate';
import { AgentRelay, type RelayReports } from './agent-relay';
import type {
  SendBack,
  ConversationEvent,
  VoiceSay,
} from './conversation-types';
import type { ConversationProviderEvent } from './provider';
import { ScreenLook } from './screen-look';
import type { ConversationSessions } from './session-link';

export type RelayInput = {
  sessions: ConversationSessions;
  sessionId: string;
};

// What the relay hears from the voice: its requests for work and for a picture. What each side said reaches it from the machine too.
export const asksTheRelay = (heard: ConversationProviderEvent): boolean =>
  heard.type === 'work.requested' || heard.type === 'frame.requested';

type Hearers = { relay: AgentRelay; look: ScreenLook };

function hear({ relay, look }: Hearers, heard: ConversationProviderEvent): void {
  if (heard.type === 'work.requested')
    void relay.request(heard.requestId, heard.text);
  else look.hear(heard);
}

// What the machine forwards: the call being answered, then what the voice and the person said and asked for.
function route(hearers: Hearers, event: ConversationEvent): void {
  if (event.type === 'call.answered') hearers.look.answered(event.canLook);

  if (event.type === 'provider.event') hear(hearers, event.event);
}

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

    const reports = reportsTo(sendBack);
    const relay = new AgentRelay(sessions, input, reports);
    const look = new ScreenLook(sessions, input, reports.speak);

    receive((event) => route({ relay, look }, event));

    return sessions.watch(input.sessionId, (happening) =>
      relay.happened(happening),
    );
  },
);
