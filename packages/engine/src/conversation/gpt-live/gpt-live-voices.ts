import type { VoiceOption } from '../provider';
import { defaultVoice } from './gpt-live-requests';

/*
 * GPT-Live's voices as Codex lists them (codex-rs protocol.rs, RealtimeVoicesList::builtin(), v3); the ids are what the
 * call is created with. Marin, Porto and Selva are left out: GPT-Live creates their call, then answers its link 404, so
 * the call fails before it connects (#2405 probe, 2026-11-19). A stored one falls back to the default.
 */
const serviceVoices = [
  'juniper',
  'maple',
  'spruce',
  'ember',
  'vale',
  'breeze',
  'arbor',
  'sol',
  'cove',
  'aube',
  'bubbie',
  'haetsal',
  'hanul',
  'himari',
  'leher',
  'miko',
  'neer',
  'rindo',
  'rio',
  'rivage',
  'sonna',
  'tinta',
  'viola',
];

const labelOf = (id: string): string =>
  `${id.charAt(0).toUpperCase()}${id.slice(1)}`;

// The default leads, as the first voice listed is the one chosen when none is.
export const gptLiveVoices: VoiceOption[] = [
  defaultVoice,
  ...serviceVoices.filter((id) => id !== defaultVoice),
].map((id) => ({ id, label: labelOf(id) }));
