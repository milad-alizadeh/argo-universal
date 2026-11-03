import { z } from 'zod';
import { WebUrl } from '#plugin-account-calls';
import { PluginOperationName, PluginOperationParams } from '#plugin-operations';

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

/*
 * What a Component event on a Loader page holds besides a built-in Action (ADR-0050). A Page state change merges into
 * the page's Page state, and the App asks for the page at its new address; an empty change asks again with fresh
 * Queries, as a pull to refresh does. An Operation call runs one of the Plugin's declared Operations with its
 * arguments; `optimistic` names a node by its key and the props it shows until the Operation answers. Both hold
 * scalars only: an address stays a flat cache key, and the kit's prop types stay shallow enough for TypeScript.
 */
export const PageValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export type PageValue = z.infer<typeof PageValue>;

export const PageStateChange = z.strictObject({
  pageState: z.record(z.string(), PageValue),
});

export const OperationCall = z.strictObject({
  operation: PluginOperationName,
  args: PluginOperationParams,
  optimistic: z
    .strictObject({ key: z.string(), props: z.record(z.string(), PageValue) })
    .optional(),
});

export type PageStateChange = z.infer<typeof PageStateChange>;

export type OperationCall = z.infer<typeof OperationCall>;

export const PageCall = z.union([PageStateChange, OperationCall]);

export type PageCall = z.infer<typeof PageCall>;

// What a Plugin's handler prop becomes: a Server event, an Action the App runs itself, or a Loader page's call.
export const Handler = z.union([WireEvent, Action, PageCall]);

export type Handler = z.infer<typeof Handler>;
