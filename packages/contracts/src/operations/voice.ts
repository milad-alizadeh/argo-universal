import { z } from 'zod';
import {
  VoiceEndInput,
  VoiceEndOutput,
  VoiceHangUpInput,
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
    description:
      "End the Session's Voice call from the App's End button. An Agent ends the call with voice.hangUp.",
    params: VoiceEndInput,
    result: VoiceEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'end', 'stop', 'microphone'],
  },
  'voice.hangUp': {
    id: 'voice.hangUp',
    label: 'Hang up Voice call',
    description:
      'End the Voice call of the calling Session, because the person clearly said they are done talking. Refused when the Session has no Voice call. Do not use it when the person only asks to stop work or pause.',
    params: VoiceHangUpInput,
    result: VoiceEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'goodbye', 'done', 'end'],
  },
} as const satisfies Record<string, OperationDefinition>;
