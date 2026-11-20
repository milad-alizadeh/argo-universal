import { join } from 'node:path';
import type { AnyActorRef } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import {
  voiceCallMachine,
  voiceCallSystemId,
  VoiceCalls,
  type VoiceSettingsStore,
} from '../conversation';

// The Voice call the Engine runs, behind the calls the App and Operations make of it.
export function requireVoiceCalls(
  system: AnyActorRef['system'],
  settings: VoiceSettingsStore,
  home: string,
): VoiceCalls {
  const actor = findMachineActor(system, voiceCallSystemId, voiceCallMachine);

  if (!actor) throw new Error('The Voice call machine is not running');

  return new VoiceCalls(actor, settings, join(home, 'voice-previews'));
}
