import { z } from 'zod';

// What a fetch asks for; a Query is this and nothing more, as its Project is a `useData` option.
export const FetchRead = z.object({
  url: z.string(),
  method: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  account: z.string().optional(),
});

// A call may name its Project; it defaults to the Project of the view that made the call (ADR-0037).
export const FetchCall = FetchRead.extend({
  projectId: z.string().optional(),
});

export type FetchCall = z.infer<typeof FetchCall>;
