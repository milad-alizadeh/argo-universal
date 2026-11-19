import type {
  VoiceCall,
  VoiceCallStatus,
  VoiceOrbState,
} from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { RunningCall } from './call-types';
import type { voiceCallMachine } from './call.machine';

type VoiceCallSnapshot = SnapshotFrom<typeof voiceCallMachine>;

const phases = ['starting', 'connecting', 'connected', 'reconnecting'] as const;

type Phase = (typeof phases)[number];

// How far the call has come in each running state. A reconnecting call has joined, so the Composer keeps its End and mute buttons.
const phaseStatuses: Record<Phase, VoiceCallStatus> = {
  starting: 'connecting',
  connecting: 'connecting',
  connected: 'connected',
  reconnecting: 'connected',
};

// The voice's own speech shows over the Agent's work, and the work over waiting for the person.
function liveOrb(call: RunningCall): VoiceOrbState {
  if (call.speaking) return 'talking';

  return call.agentWorking ? 'thinking' : 'listening';
}

function troubleOf(phase: Phase, call: RunningCall): VoiceCall['trouble'] {
  if (phase === 'reconnecting') return 'reconnecting';

  return call.microphoneBlocked ? 'microphone-blocked' : null;
}

const phaseOf = (snapshot: VoiceCallSnapshot): Phase =>
  phases.find((phase) => snapshot.matches({ running: phase })) ?? 'starting';

function lookOf(phase: Phase, call: RunningCall): VoiceCall {
  const { callId, sessionId, startedAt, limit } = call;

  return {
    callId,
    sessionId,
    status: phaseStatuses[phase],
    orb: phase === 'connected' ? liveOrb(call) : 'none',
    trouble: troubleOf(phase, call),
    startedAt,
    ...(limit && { limit }),
  };
}

// The Voice call as the App draws it, read from the machine's state in one place; null while no call runs.
export const voiceCallOf = (snapshot: VoiceCallSnapshot): VoiceCall | null =>
  snapshot.context.call && lookOf(phaseOf(snapshot), snapshot.context.call);
