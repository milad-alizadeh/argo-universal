import { z } from 'zod';
import {
  CustomVoice,
  CustomVoiceId,
  CustomVoiceInput,
  VoiceCallOptionsChange,
  VoiceChoice,
  VoiceInstructions,
  VoiceList,
  VoiceSettings,
  VoiceSettingsChange,
} from '../voice';
import type { OperationDefinition } from './index';

// What the next Voice call speaks with and is told (ADR-0064): the App, Agents and the CLI read and change it.
export const voiceSettingsOperations = {
  'voice.getSettings': {
    id: 'voice.getSettings',
    icon: 'settings',
    label: 'Read Voice settings',
    description:
      'Read whether Voice calls are on, the Voice provider and voice chosen, the custom voices and instructions, and the providers and voices to choose from.',
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
  'voice.listVoices': {
    id: 'voice.listVoices',
    icon: 'voice',
    label: 'List voices',
    description:
      "List the voices a Voice call can speak with: the Voice provider's built-in voices, then the person's custom voices, each with its description.",
    params: z.strictObject({}).default({}),
    result: VoiceList,
    tier: 'read',
    keywords: ['voice', 'voices', 'custom', 'list', 'speak'],
  },
  'voice.setVoice': {
    id: 'voice.setVoice',
    icon: 'voice',
    label: 'Choose voice',
    description:
      'Choose the voice the next Voice call speaks with: a built-in or custom voice from voice.listVoices. A running call keeps its voice.',
    params: VoiceChoice,
    result: VoiceSettings,
    tier: 'confirm',
    keywords: ['voice', 'choose', 'pick', 'speak', 'sound'],
  },
  'voice.saveCustomVoice': {
    id: 'voice.saveCustomVoice',
    icon: 'voice',
    label: 'Save custom voice',
    description:
      'Add a custom voice, or change the one `id` names: a name, a built-in voice to speak with, and a description of how it speaks. A running call keeps its voice; the next call uses the change.',
    params: CustomVoiceInput,
    result: CustomVoice,
    tier: 'confirm',
    keywords: ['voice', 'custom', 'add', 'edit', 'describe', 'style'],
  },
  'voice.deleteCustomVoice': {
    id: 'voice.deleteCustomVoice',
    icon: 'voice',
    label: 'Delete custom voice',
    description:
      "Delete a custom voice. When it was the chosen voice, the next call speaks with the Voice provider's first voice.",
    params: CustomVoiceId,
    result: VoiceList,
    tier: 'confirm',
    keywords: ['voice', 'custom', 'delete', 'remove'],
  },
  'voice.setInstructions': {
    id: 'voice.setInstructions',
    icon: 'voice',
    label: 'Set Voice call instructions',
    description:
      "Set the custom instructions every Voice call is told after Argo's own, such as how to address the person or what to stress. Empty removes them. A running call keeps the instructions it started with.",
    params: VoiceInstructions,
    result: VoiceSettings,
    tier: 'confirm',
    keywords: ['voice', 'instructions', 'prompt', 'persona', 'custom'],
  },
  'voice.setCallOptions': {
    id: 'voice.setCallOptions',
    icon: 'settings',
    label: 'Change Voice call options',
    description:
      "Change how Voice calls behave: the filler line when work is handed over, the opening the voice is given, the idle timeout, the voice's volume and the microphone's gain. What is left out stays. Volume and gain change a running call at once; the rest apply from the next call.",
    params: VoiceCallOptionsChange,
    result: VoiceSettings,
    tier: 'confirm',
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
