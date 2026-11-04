import { z } from 'zod';
import { WebUrl } from '#plugin-account-calls';
import { PluginOperationName } from '#plugin-operations';

// Built-in Actions run in the App without a round trip to the Server.
export const Action = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('toast'), message: z.string() }),
  // Opens the Plugin's own page at `path`, the one it defined with `argo.pages.define`; the App finds the route.
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
 * arguments; `optimistic` names nodes by their keys and the props each shows until the Operation answers. Both hold
 * scalars only: an address stays a flat cache key, and the kit's prop types stay shallow enough for TypeScript.
 */
export const PageValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type PageValue = z.infer<typeof PageValue>;

// Page state also holds a selection, as the row ids a List or Table reports.
export const PageStateValue = z.union([PageValue, z.array(z.string())]);

export type PageStateValue = z.infer<typeof PageStateValue>;

/*
 * A value the event's payload gives when it fires, in place of one the Render wrote: the payload's field it names,
 * such as a Table sort's `column`, or `true` for the whole payload, such as a Switch's value. The App puts the
 * payload's value in its place before it acts; a field the payload lacks leaves the key out.
 */
export const PayloadValue = z.strictObject({
  $payload: z.union([z.literal(true), z.string().min(1)]),
});

export type PayloadValue = z.infer<typeof PayloadValue>;

const orPayload = <Value extends z.ZodType>(
  value: Value,
): z.ZodUnion<readonly [Value, typeof PayloadValue]> =>
  z.union([value, PayloadValue]);

export const PageStateChange = z.strictObject({
  pageState: z.record(z.string(), orPayload(PageStateValue)),
});

export const OperationCall = z.strictObject({
  operation: PluginOperationName,
  args: z.record(
    PluginOperationName,
    orPayload(z.union([z.string(), z.number(), z.boolean()])),
  ),
  optimistic: z
    .array(
      z.strictObject({
        key: z.string(),
        props: z.record(z.string(), orPayload(PageValue)),
      }),
    )
    .optional(),
});

export type PageStateChange = z.infer<typeof PageStateChange>;

export type OperationCall = z.infer<typeof OperationCall>;

// A paged list's next page: the App asks for one more page of the address it shows and appends what comes back.
export const LoadMore = z.strictObject({ loadMore: z.literal(true) });

export type LoadMore = z.infer<typeof LoadMore>;

/*
 * A search's text or a selection that is Page state: the kit component holds what the person typed or chose at once,
 * and the App puts the event's value into the Page state key `bind` names once the edits pause.
 */
export const PageBind = z.strictObject({ bind: z.string().min(1) });

export type PageBind = z.infer<typeof PageBind>;

export const PageCall = z.union([
  PageStateChange,
  OperationCall,
  LoadMore,
  PageBind,
]);

export type PageCall = z.infer<typeof PageCall>;

// What a Plugin's handler prop becomes: a Server event, an Action the App runs itself, or a Loader page's call.
export const Handler = z.union([Action, PageCall]);

export type Handler = z.infer<typeof Handler>;
