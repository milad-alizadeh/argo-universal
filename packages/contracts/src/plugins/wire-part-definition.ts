import type { z } from 'zod';
import type { WirePartReference } from './wire-part-reference';

export interface WirePartDefinition {
  props: z.ZodType;
  appProps?: z.ZodType;
  expansion?: z.ZodType;
  versions: readonly z.ZodType[];
  container: boolean;
  children: boolean;
  childParts?: readonly string[];
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: WirePartReference;
}
