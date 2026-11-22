import { z } from 'zod';
import {
  ConversationOptionsChange,
  ConversationSettings,
  ConversationSettingsChange,
} from '../conversation';
import { VoiceInstructions } from '../voice';
import type { OperationDefinition } from './index';

// What the next Conversation is told and runs with (ADR-0064): the App, Agents and the CLI read and change it.
export const conversationSettingsOperations = {
  'conversation.getSettings': {
    id: 'conversation.getSettings',
    icon: 'settings',
    label: 'Read Conversation settings',
    description:
      'Read Conversation preferences and available voices. Includes enablement, provider, voice, custom voices and instructions.',
    params: z.strictObject({}).default({}),
    result: ConversationSettings,
    tier: 'read',
    policy: 'allow',
    keywords: ['conversation', 'voice', 'settings', 'provider', 'speak'],
  },
  'conversation.setSettings': {
    id: 'conversation.setSettings',
    icon: 'settings',
    label: 'Change Conversation settings',
    description:
      'Turn Conversations on or off, or choose the Conversation provider or the voice the next Conversation uses.',
    params: ConversationSettingsChange,
    result: ConversationSettings,
    tier: 'confirm',
    policy: 'person-only',
    keywords: [
      'conversation',
      'voice',
      'settings',
      'provider',
      'enable',
      'disable',
    ],
  },
  'conversation.setInstructions': {
    id: 'conversation.setInstructions',
    icon: 'voice',
    label: 'Set Conversation instructions',
    description:
      "Set the custom instructions every Conversation is told after Argo's own, such as how to address the person or what to stress. Empty removes them. A running Conversation keeps the instructions it started with.",
    params: VoiceInstructions,
    result: ConversationSettings,
    tier: 'confirm',
    policy: 'ask',
    keywords: [
      'conversation',
      'voice',
      'instructions',
      'prompt',
      'persona',
      'custom',
    ],
  },
  'conversation.setOptions': {
    id: 'conversation.setOptions',
    icon: 'settings',
    label: 'Change Conversation options',
    description:
      'Set Conversation speech, timeout and audio levels. Choose the handover filler, opening, idle timeout, voice volume and microphone gain. What is left out stays. Volume and gain change a running Conversation at once; the rest apply from the next call.',
    params: ConversationOptionsChange,
    result: ConversationSettings,
    tier: 'confirm',
    policy: 'ask',
    keywords: [
      'voice',
      'options',
      'volume',
      'gain',
      'idle',
      'timeout',
      'filler',
      'opening',
      'progress',
    ],
  },
} as const satisfies Record<string, OperationDefinition>;
