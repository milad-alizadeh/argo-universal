import {
  partEventPayload,
  type PartEvent,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';

export type PluginOnEvent = (
  key: string,
  event: PartEvent,
) => void | Promise<void>;

// A Part event before the App checks its payload against the part's event schema.
export type PartEventInput = {
  event: string;
  payload?: WireJson;
  schema: z.ZodType;
};

// A payload that fails the check is not sent; the field it came from rolls back.
export function checkedPartEvent(input: PartEventInput): PartEvent {
  const { event, schema } = input;

  try {
    return { event, payload: partEventPayload(schema, sent(input)) };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error(event, error);
    throw error;
  }
}

// A press reports a native event object; its Part event carries no payload.
const sent = ({ schema, payload }: PartEventInput): WireJson | undefined =>
  schema instanceof z.ZodUndefined ? undefined : payload;
