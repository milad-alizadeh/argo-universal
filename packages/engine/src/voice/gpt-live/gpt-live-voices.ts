import type { VoiceOption } from '../provider';
import { defaultVoice } from './gpt-live-requests';

// GPT-Live's voices as Codex lists them (codex-rs protocol.rs, RealtimeVoicesList::builtin(), v3); the ids are what the call is created with.
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
  'marin',
  'aube',
  'bubbie',
  'haetsal',
  'hanul',
  'himari',
  'leher',
  'miko',
  'neer',
  'porto',
  'rindo',
  'rio',
  'rivage',
  'selva',
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
