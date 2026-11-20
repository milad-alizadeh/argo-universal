import { z } from 'zod';
import { VoiceDeviceChange, VoiceDeviceList } from '../voice';
import type { OperationDefinition } from './index';

// The microphone and speaker of the App a Voice call uses (ADR-0064): the one carrying the call, else the one used last.
export const voiceDeviceOperations = {
  'voice.listDevices': {
    id: 'voice.listDevices',
    icon: 'voice',
    label: 'List Voice devices',
    description:
      'List the microphones and speakers of the App a Voice call uses, and the ones it chose: the App carrying the running call, else the one that started the last call, else the one connected last. Refused when no App that can carry a call is connected.',
    params: z.strictObject({}).default({}),
    result: VoiceDeviceList,
    tier: 'read',
    policy: 'allow',
    keywords: ['voice', 'microphone', 'speaker', 'audio', 'devices'],
  },
  'voice.chooseDevices': {
    id: 'voice.chooseDevices',
    icon: 'voice',
    label: 'Choose Voice devices',
    description:
      'Choose the microphone or speaker, by id from voice.listDevices, on the App a Voice call uses; null follows the system. A running call moves to them at once. Refused when no App is connected or it has no such device.',
    params: VoiceDeviceChange,
    result: VoiceDeviceList,
    tier: 'confirm',
    policy: 'ask',
    keywords: ['voice', 'microphone', 'speaker', 'audio', 'devices'],
  },
} as const satisfies Record<string, OperationDefinition>;
