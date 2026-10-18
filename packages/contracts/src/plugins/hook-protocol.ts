import { z } from 'zod';
import { PluginSurface } from '#plugin-surface';

// The core events a Plugin may hook (ADR-0027). A Plugin names the ones it hooks under `contributes.hooks`.
export const HookEventName = z.enum([
  'session.start',
  'prompt.submit',
  'tool.check',
  'turn.complete',
  'process.spawn',
  'ui.render',
]);

export type HookEventName = z.infer<typeof HookEventName>;

// What crosses between the Server and a Plugin worker while Hooks register and run.
export const Json = z.json();

export type Json = z.infer<typeof Json>;

// A Hook event crosses as a JSON object; its schema is checked where it enters and leaves the chain.
export const JsonObject = z.record(z.string(), Json);

export type JsonObject = z.infer<typeof JsonObject>;

// `hookId` is the Plugin's own count of its `argo.on` calls, so each Hook is named within its worker.
export const HookRegistration = z.object({
  hookId: z.number().int().nonnegative(),
  name: HookEventName,
  matcher: z.string().optional(),
  guard: z.boolean(),
});

export type HookRegistration = z.infer<typeof HookRegistration>;

// How one Hook ended: what it returned, with no `answer` when it returned nothing, or what it threw.
export const HookOutcome = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), answer: Json.optional() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export type HookOutcome = z.infer<typeof HookOutcome>;

export const HookCall = z.discriminatedUnion('action', [
  HookRegistration.extend({ action: z.literal('register') }),
  z.object({
    action: z.literal('next'),
    invocation: z.number(),
    event: Json,
  }),
  z.object({
    action: z.literal('settle'),
    invocation: z.number(),
    outcome: HookOutcome,
  }),
]);

export type HookCall = z.infer<typeof HookCall>;

// One Hook to run: which of the worker's Hooks, on which event.
export const HookInvocation = z.object({
  invocation: z.number(),
  hookId: z.number(),
  name: HookEventName,
  event: JsonObject,
  surface: PluginSurface.optional(),
});

export type HookInvocation = z.infer<typeof HookInvocation>;

// The Server is still running Hooks for a call a worker made, so the starting worker isn't hanging.
export const HookWaiting = z.object({
  type: z.literal('waiting'),
  pluginId: z.string(),
  generation: z.number(),
});

// A Hook to run, as the Server sends it to the Plugin host and the host passes it to the worker.
export const HostHookCommand = HookInvocation.extend({
  type: z.literal('hook'),
  pluginId: z.string(),
  generation: z.number(),
});

export const WorkerHookCommand = HookInvocation.extend({
  type: z.literal('hook'),
});
