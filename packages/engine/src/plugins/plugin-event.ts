import { WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';

// What the Server asks a running Plugin's pages to do.
export const PluginEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('open'), path: z.string() }),
  z.object({ type: z.literal('close'), path: z.string() }),
  z.object({
    type: z.literal('dispatch'),
    path: z.string(),
    eventId: z.string(),
    payload: WireJson.optional(),
  }),
]);

export type PluginEvent = z.infer<typeof PluginEvent>;
