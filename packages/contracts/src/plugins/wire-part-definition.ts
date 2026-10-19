import type { z } from 'zod';
import type { WireJson } from './wire';
import type { WirePartReference } from './wire-part-reference';

type WireProps = Record<string, WireJson>;

// The older part an App draws when it does not report this one.
export interface LoweredPart {
  type: string;
  props: WireProps;
  versions: readonly z.ZodType[];
}

export interface WirePartDefinition {
  props: z.ZodType;
  appProps?: z.ZodType;
  expansion?: z.ZodType;
  versions: readonly z.ZodType[];
  // Only the Server lowers, for Apps that predate this part.
  lower?: (props: WireProps) => LoweredPart;
  container: boolean;
  children: boolean;
  slots: Record<string, readonly string[]>;
  events: Record<string, z.ZodType>;
  reference: WirePartReference;
}
