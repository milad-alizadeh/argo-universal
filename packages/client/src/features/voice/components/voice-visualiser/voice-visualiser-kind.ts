import { z } from 'zod';

// What draws the call on the stage: ElevenLabs' orb, its LED matrix, or its live waveform.
export const voiceVisualiserKind = z.enum(['orb', 'matrix', 'wave']);

export type VoiceVisualiserKind = z.infer<typeof voiceVisualiserKind>;

// Every call starts on the orb until this Device chooses another.
export const defaultVisualiser: VoiceVisualiserKind = 'orb';
