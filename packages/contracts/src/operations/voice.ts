import { z } from 'zod';
import { ConversationSettings } from '../conversation';
import {
  CustomVoice,
  CustomVoiceId,
  CustomVoiceInput,
  VoiceChoice,
  VoiceList,
  VoicePreviewClipInput,
  VoicePreviewClipOutput,
  VoicePreviewInput,
  VoicePreviewOutput,
  VoiceStorePreviewClipInput,
  VoiceStorePreviewClipOutput,
} from '../voice';
import type { OperationDefinition } from './index';

const personOnly = 'person-only';

// The Operations of one voice (ADR-0064): listing, choosing and keeping voices, and previewing them.
export const voiceOperations = {
  'voice.listVoices': {
    id: 'voice.listVoices',
    icon: 'voice',
    label: 'List voices',
    description:
      'List the built-in and custom Conversation voices. Built-in voices come from the selected provider.',
    params: z.strictObject({}).default({}),
    result: VoiceList,
    tier: 'read',
    policy: 'allow',
    keywords: ['voice', 'voices', 'custom', 'list', 'speak'],
  },
  'voice.setVoice': {
    id: 'voice.setVoice',
    icon: 'voice',
    label: 'Choose voice',
    description:
      'Choose the voice the next Conversation speaks with: a built-in or custom voice from voice.listVoices. A running Conversation keeps its voice.',
    params: VoiceChoice,
    result: ConversationSettings,
    tier: 'confirm',
    policy: 'ask',
    keywords: ['voice', 'choose', 'pick', 'speak', 'sound'],
  },
  'voice.saveCustomVoice': {
    id: 'voice.saveCustomVoice',
    icon: 'voice',
    label: 'Save custom voice',
    description:
      'Add or change a custom voice: a name, a built-in voice to speak with, and how it speaks. A running Conversation keeps its voice; the next Conversation uses the change.',
    params: CustomVoiceInput,
    result: CustomVoice,
    tier: 'confirm',
    policy: 'ask',
    keywords: ['voice', 'custom', 'add', 'edit', 'describe', 'style'],
  },
  'voice.deleteCustomVoice': {
    id: 'voice.deleteCustomVoice',
    icon: 'voice',
    label: 'Delete custom voice',
    description:
      "Delete a custom voice. When it was the chosen voice, the next Conversation speaks with the Conversation provider's first voice.",
    params: CustomVoiceId,
    result: VoiceList,
    tier: 'confirm',
    policy: 'ask',
    keywords: ['voice', 'custom', 'delete', 'remove'],
  },
  'voice.preview': {
    id: 'voice.preview',
    icon: 'voice',
    label: 'Preview voice',
    description:
      "Play a short greeting in a voice from the App's listening-only connection, then hang up. It ends an earlier preview and is refused while a Conversation runs.",
    params: VoicePreviewInput,
    result: VoicePreviewOutput,
    tier: 'act',
    policy: personOnly,
    keywords: ['voice', 'preview', 'listen', 'greeting', 'sample'],
  },
  'voice.getPreviewClip': {
    id: 'voice.getPreviewClip',
    icon: 'voice',
    label: 'Read stored voice greeting',
    description:
      "Read the greeting the Server stored for a voice, to play it with no provider call. Null until the App's first preview of that voice has been stored.",
    params: VoicePreviewClipInput,
    result: VoicePreviewClipOutput,
    tier: 'read',
    policy: personOnly,
    keywords: ['voice', 'preview', 'greeting', 'sample', 'clip', 'cache'],
  },
  'voice.storePreviewClip': {
    id: 'voice.storePreviewClip',
    icon: 'voice',
    label: 'Store voice greeting',
    description:
      "Store the greeting the App recorded from a voice's first preview, so later previews replay it. It replaces a clip stored for the same voice and settings.",
    params: VoiceStorePreviewClipInput,
    result: VoiceStorePreviewClipOutput,
    tier: 'act',
    policy: personOnly,
    keywords: ['voice', 'preview', 'greeting', 'sample', 'clip', 'store'],
  },
} as const satisfies Record<string, OperationDefinition>;
