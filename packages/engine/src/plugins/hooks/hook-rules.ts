import { isDeepStrictEqual } from 'node:util';
import { hookEvents, type HookEventName } from '@repo/contracts/plugins';
import { JsonObject, type Json } from '@repo/contracts/plugins/hook-protocol';

type EventRule = {
  // What core answers at the bottom of the chain: a fixed answer, or the event's fields it carries on.
  core: { answer: Json } | { carries: readonly string[] };
  // What a guard answers when its Hook fails; an event without one can't be guarded.
  refusal?: Json;
  // What a matcher is compared with; an event without one takes no matcher.
  subject?: (event: JsonObject) => string | undefined;
  // The fields a Hook may rewrite with `next({ ...e })`; the rest stay as core gave them.
  rewritable: readonly string[];
  // The Plugin whose own call the event is; its Hooks never see it, so a Hook can't loop on itself.
  caller?: (event: JsonObject) => string | undefined;
};

type HookRules = Record<HookEventName, EventRule>;

const hookRules: HookRules = {
  'session.start': { core: { answer: null }, rewritable: [] },
  'prompt.submit': {
    core: { carries: ['prompt'] },
    refusal: { dropped: true },
    rewritable: ['prompt'],
  },
  'tool.call': {
    core: { answer: { decision: 'ask' } },
    refusal: { decision: 'deny' },
    subject: (event) =>
      hookEvents['tool.call'].event.safeParse(event).data?.request.title,
    rewritable: [],
  },
  'turn.complete': { core: { answer: null }, rewritable: [] },
  'process.spawn': {
    core: { carries: ['argv', 'cwd'] },
    refusal: { blocked: 'A guard Hook failed' },
    subject: (event) =>
      hookEvents['process.spawn'].event.safeParse(event).data?.argv[0],
    rewritable: ['argv', 'cwd'],
    caller: (event) =>
      hookEvents['process.spawn'].event.safeParse(event).data?.pluginId,
  },
};

export function coreAnswer(name: HookEventName, event: JsonObject): Json {
  const { core } = hookRules[name];

  return 'answer' in core ? core.answer : carried(event, core.carries);
}

const carried = (event: JsonObject, keys: readonly string[]): JsonObject =>
  Object.fromEntries(
    Object.entries(event).filter(([key]) => keys.includes(key)),
  );

export const guardRefusal = (name: HookEventName): Json | undefined =>
  hookRules[name].refusal;

export const callerOf = (
  name: HookEventName,
  event: JsonObject,
): string | undefined => hookRules[name].caller?.(event);

export const takesMatcher = (name: HookEventName): boolean =>
  hookRules[name].subject !== undefined;

const matchesEvery = (matcher: string | undefined): boolean =>
  matcher === undefined || matcher === '*';

const subjectOf = (
  name: HookEventName,
  event: JsonObject,
): string | undefined => hookRules[name].subject?.(event);

// No matcher, or `*`, matches every event; any other matcher names the subject exactly.
export const matches = (
  name: HookEventName,
  matcher: string | undefined,
  event: JsonObject,
): boolean => matchesEvery(matcher) || subjectOf(name, event) === matcher;

export const isAnswer = (name: HookEventName, answer: Json): boolean =>
  hookEvents[name].answer.safeParse(answer).success;

type Rewrite = { name: HookEventName; original: JsonObject; rewrite: Json };

// A rewrite keeps its event's shape and changes only the fields the event allows.
export function readRewrite({ name, original, rewrite }: Rewrite): JsonObject {
  const event = JsonObject.safeParse(rewrite).data;

  if (!event || !hookEvents[name].event.safeParse(event).success)
    throw new Error(`The rewritten ${name} event has the wrong shape`);

  requireFixed(name, original, event);

  return event;
}

function requireFixed(
  name: HookEventName,
  original: JsonObject,
  event: JsonObject,
): void {
  const { rewritable } = hookRules[name];
  const keys = new Set([...Object.keys(original), ...Object.keys(event)]);

  const changed = [...keys].filter(
    (key) =>
      !rewritable.includes(key) &&
      !isDeepStrictEqual(event[key], original[key]),
  );

  if (changed.length > 0)
    throw new Error(`A ${name} Hook may not rewrite ${changed.join(', ')}`);
}
