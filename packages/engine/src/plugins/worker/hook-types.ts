import type {
  HookAnswer,
  HookEvent,
  HookEventName,
} from '@repo/contracts/plugins';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type { ReactElement } from 'react';

type RenderProps = HookEvent<'ui.render'>['props'];

// What a Hook is told besides its event: which event, on which App, and a `ui.render` slot's props.
export type HookContext<Name extends HookEventName> = Readonly<{
  name: Name;
  surface: PluginSurface | undefined;
  props: Name extends 'ui.render' ? Readonly<RenderProps> : undefined;
}>;

// Passes the event, or a rewrite of it, down the chain and resolves to what the rest of it answered.
export type HookNext<Name extends HookEventName> = (
  event?: HookEvent<Name>,
) => Promise<HookAnswer<Name>>;

// Nothing passes on what `next` answered; a `ui.render` Hook may answer with kit components.
type HookResult<Name extends HookEventName> =
  | HookAnswer<Name>
  | undefined
  | (Name extends 'ui.render' ? ReactElement : never);

export type Hook<Name extends HookEventName> = (
  context: HookContext<Name>,
  event: HookEvent<Name>,
  next: HookNext<Name>,
) => HookResult<Name> | Promise<HookResult<Name>>;

// A guard's failure refuses its event instead of skipping the Hook.
export type HookOptions = Readonly<{ guard?: boolean }>;

// The Hook alone, or after a matcher that narrows it to one slot, command or tool.
export type HookArgs<Handler> =
  | [hook: Handler, options?: HookOptions]
  | [matcher: string | undefined, hook: Handler, options?: HookOptions];

// `argo.on`: registers a Hook on one core event (ADR-0027).
export type HookRegistrar = <Name extends HookEventName>(
  name: Name,
  ...args: HookArgs<Hook<Name>>
) => Promise<void>;
