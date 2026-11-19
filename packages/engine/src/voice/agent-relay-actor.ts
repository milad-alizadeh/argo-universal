import type { VoiceReadOut } from '@repo/contracts';
import { fromCallback } from 'xstate';
import { AgentRelay, type RelayReports } from './agent-relay';
import type { SendBack, VoiceCallEvent, VoiceSay } from './call-types';
import type { VoiceSessions } from './session-link';

export type RelayInput = {
  sessions: VoiceSessions;
  sessionId: string;
  readOut: VoiceReadOut;
};

type WorkRequest = { requestId: string; text: string };

const workRequestOf = (event: VoiceCallEvent): WorkRequest | undefined =>
  event.type === 'provider.event' && event.event.type === 'work.requested'
    ? event.event
    : undefined;

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
