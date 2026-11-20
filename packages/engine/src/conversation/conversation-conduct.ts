import {
  defaultVoiceCallOptions,
  type VoiceCallOptions,
} from '@repo/contracts';
import type { CallConduct } from './conversation-types';

const msPerSecond = 1000;

// How Argo runs a call under the person's options.
export const conductOf = (
  options: Pick<VoiceCallOptions, 'idleSeconds'>,
): CallConduct => ({
  idleMs: options.idleSeconds * msPerSecond,
});

// What a call is run with when its start says nothing.
export const defaultConduct = conductOf(defaultVoiceCallOptions);
