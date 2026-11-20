import { providerEvent, type VoiceCallEvent } from '../src/conversation/conversation-types';
import { detachedSessions } from '../src/conversation/session-link';

export const start: Extract<VoiceCallEvent, { type: 'call.start' }> = {
  type: 'call.start',
  callId: 'call-1',
  sessionId: 'session-1',
  offer: 'offer',
};

export const events: VoiceCallEvent[] = [
  start,
  { type: 'call.answered', answer: 'answer' },
  { type: 'call.end', reason: 'person' },
  { type: 'call.failed', message: 'no' },
  { type: 'call.sessionGone', reason: 'session-closed' },
  { type: 'call.sessionGone', reason: 'session-archived' },
  { type: 'call.appDisconnected' },
  { type: 'voice.say', say: { kind: 'tell', text: 'Done', delivery: 'speak' } },
  providerEvent({ type: 'status', status: 'connected' }),
  providerEvent({ type: 'status', status: 'disconnected' }),
  providerEvent({ type: 'status', status: 'error' }),
  providerEvent({ type: 'closed', reason: 'ended' }),
  providerEvent({ type: 'closed', reason: 'limit' }),
  providerEvent({ type: 'limit', remaining: 0.1 }),
  providerEvent({ type: 'usage', inputTokens: 9, outputTokens: 1 }),
  providerEvent({
    type: 'usage',
    inputTokens: 900,
    outputTokens: 100,
    limit: { remaining: 0.05 },
  }),
  providerEvent({
    type: 'person.transcript',
    id: 'p1',
    text: 'Hello',
    final: true,
  }),
  { type: 'call.turns', running: false },
  { type: 'call.turns', running: true },
  providerEvent({ type: 'speaking', speaking: true }),
  providerEvent({ type: 'trouble', trouble: 'microphone-blocked' }),
  { type: 'session.turn', running: true },
  { type: 'sessions.attach', sessions: detachedSessions },
];
