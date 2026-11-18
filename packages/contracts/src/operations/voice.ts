import { z } from 'zod';
import {
  VoiceEndInput,
  VoiceEndOutput,
  VoiceSettings,
  VoiceSettingsChange,
  VoiceStartInput,
  VoiceStartOutput,
  VoiceStatus,
} from '../voice';
import type { OperationDefinition } from './index';

// The Voice call's Operations (ADR-0062): the App starts one with its connection offer and ends it; anyone reads its status.
export const voiceOperations = {
  'voice.status': {
    id: 'voice.status',
    label: 'Read Voice call status',
    icon: 'voice',
    description:
      'Read the running Voice call, how the last one ended, and whether a new one can start.',
    params: z.strictObject({}).default({}),
    result: VoiceStatus,
    tier: 'read',
    keywords: ['voice', 'call', 'talk', 'speak', 'microphone'],
  },
  'voice.start': {
    id: 'voice.start',
    label: 'Start Voice call',
    icon: 'voice',
    description:
      "Start a Voice call attached to a Session from the App's connection offer. One Voice call runs at a time.",
    params: VoiceStartInput,
    result: VoiceStartOutput,
    tier: 'confirm',
    keywords: ['voice', 'call', 'talk', 'speak', 'microphone', 'start'],
  },
  'voice.end': {
    id: 'voice.end',
    label: 'End Voice call',
    icon: 'voice-off',
    description:
      "End the Session's Voice call. Use it when the person asks to hang up.",
    params: VoiceEndInput,
    result: VoiceEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'end', 'stop', 'microphone'],
  },
  'voice.getSettings': {
    id: 'voice.getSettings',
    icon: 'settings',
    label: 'Read Voice settings',
    description:
      'Read whether Voice calls are on, the Voice provider and voice chosen, and the providers and voices to choose from.',
    params: z.strictObject({}).default({}),
    result: VoiceSettings,
    tier: 'read',
    keywords: ['voice', 'settings', 'provider', 'speak'],
  },
  'voice.setSettings': {
    id: 'voice.setSettings',
    icon: 'settings',
    label: 'Change Voice settings',
    description:
      'Turn Voice calls on or off, or choose the Voice provider or the voice the next call uses.',
    params: VoiceSettingsChange,
    result: VoiceSettings,
    tier: 'confirm',
    keywords: ['voice', 'settings', 'provider', 'enable', 'disable'],
  },
} as const satisfies Record<string, OperationDefinition>;
