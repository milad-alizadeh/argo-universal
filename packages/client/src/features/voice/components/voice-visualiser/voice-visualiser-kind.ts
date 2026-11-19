import { z } from 'zod';

// What draws the call: ElevenLabs' orb on the stage above the Feed, or a slim waveform band along the Composer's top edge.
export const voiceVisualiserKind = z.enum(['orb', 'band']);

export type VoiceVisualiserKind = z.infer<typeof voiceVisualiserKind>;

// Every call starts on the orb until this Device chooses the band in Settings › Voice.
export const defaultVisualiser: VoiceVisualiserKind = 'orb';
