import type {
  Conversation,
  ConversationPhase,
  ConversationState,
} from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { RunningCall } from './conversation-types';
import type { conversationMachine } from './conversation.machine';

type ConversationSnapshot = SnapshotFrom<typeof conversationMachine>;

const phases = ['starting', 'connecting', 'connected', 'reconnecting'] as const;

type Phase = (typeof phases)[number];

// How far the call has come in each running state. A reconnecting call has joined, so the Composer keeps its End and mute buttons.
const phaseStatuses: Record<Phase, ConversationPhase> = {
  starting: 'connecting',
  connecting: 'connecting',
  connected: 'connected',
  reconnecting: 'connected',
};

// The voice's own speech shows over the Agent's work, and the work over waiting for the person.
function liveOrb(call: RunningCall): ConversationState {
  if (call.speaking) return 'talking';

  return call.agentWorking ? 'thinking' : 'listening';
}

function troubleOf(phase: Phase, call: RunningCall): Conversation['trouble'] {
  if (phase === 'reconnecting') return 'reconnecting';

  return call.microphoneBlocked ? 'microphone-blocked' : null;
}

const phaseOf = (snapshot: ConversationSnapshot): Phase =>
  phases.find((phase) => snapshot.matches({ running: phase })) ?? 'starting';

function lookOf(phase: Phase, call: RunningCall): Conversation {
  const { conversationId, sessionId, startedAt, limit } = call;

  return {
    conversationId,
    sessionId,
    status: phaseStatuses[phase],
    state: phase === 'connected' ? liveOrb(call) : 'none',
    trouble: troubleOf(phase, call),
    startedAt,
    ...(limit && { limit }),
  };
}

// The Conversation as the App draws it, read from the machine's state in one place; null while no call runs.
export const conversationOf = (
  snapshot: ConversationSnapshot,
): Conversation | null =>
  snapshot.context.call && lookOf(phaseOf(snapshot), snapshot.context.call);
