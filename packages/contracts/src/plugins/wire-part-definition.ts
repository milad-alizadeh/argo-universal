import type { z } from 'zod';

// The kit folder a part is drawn in, `packages/kit/src/primitives/<group>/` (tools/kit-pairing-rules.mts).
export const partGroups = [
  'actions',
  'content',
  'controls',
  'fields',
  'layout',
  'lists',
  'overlays',
  'scaffolds',
  'status',
  'visual',
] as const;

export type PartGroup = (typeof partGroups)[number];

export interface PartAccessibility {
  label: string;
  keyboard: string;
  voiceOver: string;
  talkBack: string;
}

// What a part's reference page says that its schema cannot; the docs generator infers the rest (tools/plugin-reference-inference.ts).
export interface PartReference {
  summary: string;
  label: string | undefined;
  appearance: string | undefined;
  accessibility: Partial<PartAccessibility> | undefined;
  sdkProps: string | undefined;
}

// The one definition of a kit component: its props, events, slots and reference text, its group, and whether a Plugin can send it.
export interface WirePartDefinition {
  props: z.ZodType;
  expansion?: z.ZodType;
  container: boolean;
  children: boolean | readonly string[];
  // Only a tree's root may be this part, such as a Screen that owns the screen's header.
  root?: boolean;
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: PartReference;
  group: PartGroup;
  // False for a kit component only the App draws; it is not on the Plugin wire.
  wire: boolean;
}
