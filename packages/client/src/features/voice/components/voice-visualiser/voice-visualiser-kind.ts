import { z } from 'zod';

/*
 * What draws the call: ElevenLabs' orb, its LED matrix or its live waveform on the stage, or a slim waveform band along
 * the Composer's top edge in place of the stage.
 */
export const voiceVisualiserKind = z.enum(['orb', 'matrix', 'wave', 'band']);

export type VoiceVisualiserKind = z.infer<typeof voiceVisualiserKind>;

// Every call starts on the orb until this Device chooses another.
export const defaultVisualiser: VoiceVisualiserKind = 'orb';
