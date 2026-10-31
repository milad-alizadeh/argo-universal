import { z } from 'zod';
import { WebUrl } from '#plugin-account-calls';

// A handler prop on the wire; the App sends it back as a Component event by node key and event name.
export const WireEvent = z.strictObject({
  $event: z.string().min(1),
});

export type WireEvent = z.infer<typeof WireEvent>;

// Built-in Actions run in the App without a round trip to the Server.
export const Action = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('toast'), message: z.string() }),
  // Opens the Plugin's own page at `path`, the one it registered with `argo.pages.register`; the App finds the route.
  z.strictObject({ action: z.literal('navigate'), path: z.string() }),
  z.strictObject({ action: z.literal('openUrl'), url: WebUrl }),
  z.strictObject({ action: z.literal('copy'), text: z.string() }),
  z.strictObject({
    action: z.literal('share'),
    message: z.string(),
    url: WebUrl.optional(),
    title: z.string().optional(),
  }),
  z.strictObject({ action: z.literal('pop') }),
  // Opens one of the App's own Sessions, such as a Session a Plugin's page connected to its item.
  z.strictObject({
    action: z.literal('openSession'),
    sessionId: z.string().min(1),
  }),
  // Opens New Session for the Project with `draft` in the Composer; nothing is stored until the person sends it.
  z.strictObject({
    action: z.literal('newSession'),
    projectId: z.string().min(1),
    draft: z.string().min(1),
  }),
]);

export type Action = z.infer<typeof Action>;

// What a Plugin's handler prop becomes: a Server event, or an Action the App runs itself.
export const Handler = z.union([WireEvent, Action]);

export type Handler = z.infer<typeof Handler>;
