import {
  defaultVoiceCallOptions,
  type VoiceCallOptions,
} from '@repo/contracts';
import type { CallConduct } from './call-types';

const msPerSecond = 1000;

// How Argo runs a call under the person's options.
export const conductOf = (
  options: Pick<VoiceCallOptions, 'idleSeconds' | 'readOut'>,
): CallConduct => ({
  idleMs: options.idleSeconds * msPerSecond,
  readOut: options.readOut,
});

// What a call is run with when its start says nothing.
export const defaultConduct = conductOf(defaultVoiceCallOptions);
