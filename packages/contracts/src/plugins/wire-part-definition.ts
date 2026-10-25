import type { z } from 'zod';
import type { WirePartReference } from './wire-part-reference';

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

// The one definition of a kit component: its props, events, slots and accessibility facts, its group, and whether a Plugin can send it.
export interface WirePartDefinition {
  props: z.ZodType;
  // The props a Plugin may send when they differ from the ones the kit draws, as a draft control may leave its handler off.
  wireProps?: z.ZodType;
  appProps?: z.ZodType;
  expansion?: z.ZodType;
  container: boolean;
  children: boolean | readonly string[];
  // Only a tree's root may be this part, such as a Screen that owns the screen's header.
  root?: boolean;
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: WirePartReference;
  group: PartGroup;
  // False for a kit component only the App draws; it is not on the Plugin wire.
  wire: boolean;
}
