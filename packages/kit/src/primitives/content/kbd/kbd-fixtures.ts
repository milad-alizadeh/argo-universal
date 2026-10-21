import type { KbdProps } from './kbd';

export const singleKeyKbd = { keys: ['↵'] } satisfies KbdProps;

export const chordKbd = { keys: ['⇧', '⌘', 'C'] } satisfies KbdProps;
