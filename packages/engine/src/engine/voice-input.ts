import type { AnyActorRef } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import { voiceCallMachine, voiceCallSystemId, VoiceCalls } from '../voice';

// The Voice call the Engine runs, behind the calls the App and Operations make of it.
export function requireVoiceCalls(system: AnyActorRef['system']): VoiceCalls {
  const actor = findMachineActor(system, voiceCallSystemId, voiceCallMachine);

  if (!actor) throw new Error('The Voice call machine is not running');

  return new VoiceCalls(actor);
}
