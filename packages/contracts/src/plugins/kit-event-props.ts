import { z } from 'zod';
import { Action, WireEvent } from './wire';

export const pressHandler = z
  .union([WireEvent.extend({ $event: z.literal('onPress') }), Action])
  .describe('A Plugin event handler or an App action.');

export type AcknowledgedEvent = z.ZodUndefined & {
  readonly acknowledgement: true;
};

// The part waits for its dispatch to settle; its callback may return a promise.
export function acknowledgedEvent(within?: string): AcknowledgedEvent {
  const schema = z.undefined().meta({ within, awaits: true, blocks: false });

  return Object.assign(schema, { acknowledgement: true as const });
}
