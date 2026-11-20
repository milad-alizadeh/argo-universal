import { fromCallback } from 'xstate';
import { AgentRelay, type RelayReports } from './agent-relay';
import type { SendBack, VoiceCallEvent, VoiceSay } from './call-types';
import type { VoiceProviderEvent } from './provider';
import { ScreenLook } from './screen-look';
import type { VoiceSessions } from './session-link';

export type RelayInput = {
  sessions: VoiceSessions;
  sessionId: string;
};

// What the relay hears from the voice: its requests for work and for a picture. What each side said reaches it from the machine too.
export const asksTheRelay = (heard: VoiceProviderEvent): boolean =>
  heard.type === 'work.requested' || heard.type === 'frame.requested';

type Hearers = { relay: AgentRelay; look: ScreenLook };

function hear({ relay, look }: Hearers, heard: VoiceProviderEvent): void {
  if (heard.type === 'work.requested')
    void relay.request(heard.requestId, heard.text);
  else look.hear(heard);
}

// What the machine forwards: the call being answered, then what the voice and the person said and asked for.
function route(hearers: Hearers, event: VoiceCallEvent): void {
  if (event.type === 'call.answered') hearers.look.answered(event.canLook);

  if (event.type === 'provider.event') hear(hearers, event.event);
}

const reportsTo = (sendBack: SendBack): RelayReports => ({
  speak: (say: VoiceSay): void => sendBack({ type: 'voice.say', say }),
  turnsRunning: (running: boolean): void =>
    sendBack({ type: 'call.turns', running }),
});

/*
 * The go-between of one Voice call and its Session. The machine forwards the person's requests for work to it; it sends
 * back what the voice should be told, as `voice.say`.
 */
export const agentRelay = fromCallback<VoiceCallEvent, RelayInput>(
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
