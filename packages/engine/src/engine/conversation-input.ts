import { join } from 'node:path';
import type { AnyActorRef } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import {
  conversationMachine,
  conversationSystemId,
  Conversations,
  type ConversationSettingsStore,
} from '../conversation';

// The Conversation the Engine runs, behind the calls the App and Operations make of it.
export function requireConversations(
  system: AnyActorRef['system'],
  settings: ConversationSettingsStore,
  home: string,
): Conversations {
  const actor = findMachineActor(system, conversationSystemId, conversationMachine);

  if (!actor) throw new Error('The Conversation machine is not running');

  return new Conversations(actor, settings, join(home, 'voice-previews'));
}
