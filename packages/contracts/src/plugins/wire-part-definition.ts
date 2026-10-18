import type { z } from 'zod';
import type { PartUi } from './part-ui';
import type { WirePartReference } from './wire-part-reference';

export interface WirePartDefinition {
  ui?: PartUi;
  props: z.ZodType;
  appProps?: z.ZodType;
  expansion?: z.ZodType;
  versions: readonly z.ZodType[];
  container: boolean;
  children: boolean;
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: WirePartReference;
}
