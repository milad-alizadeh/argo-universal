import { fromCallback } from 'xstate';
import { AgentRelay } from './agent-relay';
import type { VoiceCallEvent } from './call-types';
import type { SessionLink, VoiceSessions } from './session-link';

export type RelayInput = { sessions: SessionLink; sessionId: string };

// What a call has before Sessions are attached: nothing to send to, nothing to hear.
const detached: VoiceSessions = {
  prompt: () => Promise.reject(new Error('The Session cannot be reached')),
  watch: () => (): void => {},
  notice: () => {},
};

type WorkRequest = { requestId: string; text: string };

const workRequestOf = (event: VoiceCallEvent): WorkRequest | undefined =>
  event.type === 'provider.event' && event.event.type === 'work.requested'
    ? event.event
    : undefined;

/*
 * The go-between of one Voice call and its Session. The machine forwards the person's requests for work to it; it sends
 * back what the voice should be told, as `voice.say`.
 */
export const agentRelay = fromCallback<VoiceCallEvent, RelayInput>(
  ({ input, sendBack, receive }) => {
    const sessions = input.sessions.current ?? detached;

    const relay = new AgentRelay(
      sessions,
      input.sessionId,
      (say) => sendBack({ type: 'voice.say', say }),
      (running) => sendBack({ type: 'call.turns', running }),
    );

    receive((event) => {
      const request = workRequestOf(event);

      if (request) void relay.request(request.requestId, request.text);
    });

    return sessions.watch(input.sessionId, (happening) =>
      relay.happened(happening),
    );
  },
);
