import type { z } from 'zod';
import type { WirePartReference } from './wire-part-reference';

export interface WirePartDefinition {
  props: z.ZodType;
  appProps?: z.ZodType;
  expansion?: z.ZodType;
  versions: readonly z.ZodType[];
  container: boolean;
  // True takes any part; a list takes only those part types.
  children: boolean | readonly string[];
  // Only a tree's root may be this part, such as a Page that owns the screen's header.
  root?: boolean;
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: WirePartReference;
}
