import { z } from 'zod';
import {
  VoiceEndInput,
  VoiceEndOutput,
  VoicePreviewInput,
  VoicePreviewOutput,
  VoiceStartInput,
  VoiceStartOutput,
  VoiceStatus,
} from '../voice';
import type { OperationDefinition } from './index';

// The Voice call's Operations (ADR-0064): the App starts, ends, reads and previews calls; an Agent only hangs up its own.
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
    description: "End the Session's Voice call from the App's End button.",
    params: VoiceEndInput,
    result: VoiceEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'end', 'stop', 'microphone'],
  },
  'voice.preview': {
    id: 'voice.preview',
    icon: 'voice',
    label: 'Preview voice',
    description:
      "Play a short greeting in a voice from the App's listening-only connection, then hang up. It ends an earlier preview and is refused while a Voice call runs.",
    params: VoicePreviewInput,
    result: VoicePreviewOutput,
    tier: 'act',
    keywords: ['voice', 'preview', 'listen', 'greeting', 'sample'],
  },
  'voice.hangUp': {
    id: 'voice.hangUp',
    icon: 'voice-off',
    label: 'Hang up Voice call',
    description:
      'End the Voice call of the calling Session, because the person clearly said they are done talking. Refused when the Session has no Voice call, and for any other Session. Do not use it when the person only asks to stop work or pause.',
    params: VoiceEndInput,
    result: VoiceEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'goodbye', 'done', 'end'],
  },
} as const satisfies Record<string, OperationDefinition>;
