import type { HookEvent, HookEventName } from '@repo/contracts/plugins';
import type {
  HookInvocation,
  HookOutcome,
  HookCall,
  Json,
} from '@repo/contracts/plugins/hook-protocol';
import type { Kit } from '../kit/plugin-kit';
import type { ArgoCall } from './create-plugin-api';
import type {
  Hook,
  HookArgs,
  HookContext,
  HookOptions,
  HookRegistrar,
} from './hook-types';

/*
 * A Hook as the worker runs it: its event and answers cross as JSON, which the Server checks.
 * A kit element is an object too; only a `ui.render` Hook's becomes a replacement.
 */
type JsonHook = (
  context: HookContext<HookEventName>,
  event: HookInvocation['event'],
  next: JsonNext,
) => Json | undefined | Promise<Json | undefined>;

// The Server checks a `ui.render` event against its slot before it invokes a Hook on it.
type Invocation = HookInvocation &
  (
    | { name: 'ui.render'; event: HookEvent<'ui.render'> }
    | { name: Exclude<HookEventName, 'ui.render'> }
  );

type JsonNext = (event?: Json) => Promise<Json>;

type HookInbox = { on: HookRegistrar; inbox: (json: string) => void };

// `argo.on` and the inbox the worker sends each invocation to, by the `hookId` its registration got.
export function hookInbox(call: ArgoCall, kit: Kit): HookInbox {
  const hooks: JsonHook[] = [];

  return {
    on: registrar(call, hooks),
    inbox: (json) => {
      const invocation: Invocation = JSON.parse(json);

      runHook({ call, kit, hook: hooks[invocation.hookId] }, invocation);
    },
  };
}

// Each Hook's events cross as JSON, so the worker keeps it by its `hookId` alone.
function registrar(call: ArgoCall, hooks: JsonHook[]): HookRegistrar {
  function on<Name extends HookEventName>(
    name: Name,
    ...args: HookArgs<Hook<Name>>
  ): Promise<void>;
  async function on(
    name: HookEventName,
    ...args: HookArgs<JsonHook>
  ): Promise<void> {
    await call({ api: 'hooks', call: register(hooks, name, args) });
  }

  return on;
}

const hookFirst = (
  args: HookArgs<JsonHook>,
): args is [hook: JsonHook, options?: HookOptions] =>
  typeof args[0] === 'function';

// Keeps the Hook under its count of `argo.on` calls, which names it to the Server.
function register(
  hooks: JsonHook[],
  name: HookEventName,
  args: HookArgs<JsonHook>,
): Extract<HookCall, { action: 'register' }> {
  const [matcher, hook, options] = hookFirst(args)
    ? [undefined, ...args]
    : args;

  const hookId = hooks.push(hook) - 1;
  const guard = options?.guard === true;

  return { action: 'register', hookId, name, matcher, guard };
}

type HookRun = { call: ArgoCall; kit: Kit; hook: JsonHook | undefined };

// Runs one invocation after the current task, then settles it with what the Hook answered or threw.
function runHook(run: HookRun, invocation: Invocation): void {
  const settle = settleOf(run.call, invocation.invocation);

  Promise.resolve()
    .then(() => answerOf(run, invocation))
    .then(
      (answer) =>
        settle(answer === undefined ? { ok: true } : { ok: true, answer }),
      (error) =>
        settle({ ok: false, error: String(error ? error.message : error) }),
    );
}

// A settle the worker can no longer send is dropped: its chain has gone on without it.
const settleOf =
  (call: ArgoCall, invocation: number) =>
  async (outcome: HookOutcome): Promise<void> => {
    await call({
      api: 'hooks',
      call: { action: 'settle', invocation, outcome },
    }).catch(() => null);
  };

async function answerOf(
  { call, kit, hook }: HookRun,
  invocation: Invocation,
): Promise<Json | undefined> {
  const context = contextOf(invocation);
  const event = eventOf(invocation);
  const answer = await hookAt(hook)(context, event, nextOf(call, invocation));

  return invocation.name === 'ui.render' && kit.isElement(answer)
    ? kit.replacement(invocation.invocation, answer)
    : answer;
}

// `next()` passes the event on as it came.
const nextOf =
  (call: ArgoCall, { invocation, event }: HookInvocation): JsonNext =>
  (rewritten = event) =>
    call({
      api: 'hooks',
      call: { action: 'next', invocation, event: rewritten },
    });

const contextOf = (invocation: Invocation): HookContext<HookEventName> =>
  deepFreeze({
    name: invocation.name,
    surface: invocation.surface,
    props: invocation.name === 'ui.render' ? invocation.event.props : undefined,
  });

// A `ui.render` event is the slot's input, which the Hook reads but may only rewrite through `next`.
const eventOf = ({ name, event }: HookInvocation): HookInvocation['event'] =>
  name === 'ui.render' ? deepFreeze(event) : event;

// The Server only invokes Hooks it registered; a missing one fails as calling it would.
function hookAt(hook: JsonHook | undefined): JsonHook {
  if (!hook) throw new TypeError('hooks[hookId] is not a function');

  return hook;
}

function deepFreeze<Value>(value: Value): Value {
  if (!value || typeof value !== 'object') return value;

  freezeAll(Object.values(value));
  Object.freeze(value);

  return value;
}

function freezeAll<Value>(values: Value[]): void {
  for (const value of values) deepFreeze(value);
}
