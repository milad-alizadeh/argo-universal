import type { VoiceCall, VoiceOrbState, VoiceTrouble } from '@repo/contracts';
import type { RunningCall } from './call-types';

// The voice's own speech shows over the Agent's work, and the work over waiting for the person.
function liveOrb(call: RunningCall): VoiceOrbState {
  if (call.speaking) return 'talking';

  return call.agentWorking ? 'thinking' : 'listening';
}

// What the orb shows: nothing while the call has no connection.
const orbOf = (call: RunningCall): VoiceOrbState =>
  call.providerConnection === 'connected' ? liveOrb(call) : 'none';

function troubleOf(call: RunningCall): VoiceTrouble | null {
  if (call.providerConnection === 'disconnected') return 'reconnecting';

  return call.microphoneBlocked ? 'microphone-blocked' : null;
}

// How the call looks to the App, apart from where it runs: its connection, orb, trouble and when its timer started.
export const lookOf = (
  call: RunningCall,
): Pick<VoiceCall, 'connection' | 'orb' | 'trouble' | 'startedAt'> => ({
  connection: call.providerConnection,
  orb: orbOf(call),
  trouble: troubleOf(call),
  startedAt: call.startedAt,
});
