import { z } from 'zod';
import { Action, WireEvent } from './wire';

export const pressHandler = z
  .union([WireEvent.extend({ $event: z.literal('onPress') }), Action])
  .describe('A Plugin event handler or an App action.');

export type AcknowledgedEvent = z.ZodUndefined & {
  readonly acknowledgement: true;
};

type Acknowledged<Schema extends z.ZodType> = Schema & {
  readonly acknowledgement: true;
};

// The one shape of an acknowledged event: the kit component awaits its dispatch, which does not block the view.
function acknowledged<Schema extends z.ZodType>(
  schema: Schema,
  within?: string,
): Acknowledged<Schema> {
  return Object.assign(schema.meta({ within, awaits: true, blocks: false }), {
    acknowledgement: true as const,
  });
}

// The kit component waits for its dispatch to settle; its callback may return a promise.
export function acknowledgedEvent(within?: string): AcknowledgedEvent {
  return acknowledged(z.undefined(), within);
}

// An acknowledged event that carries a payload: the kit component holds what it showed until the dispatch settles.
export function acknowledgedPayload<Schema extends z.ZodType>(
  payload: Schema,
): Acknowledged<Schema> {
  return acknowledged(payload);
}
