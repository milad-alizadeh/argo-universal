import type { Argo } from '@repo/contracts/plugins/argo-api';
import type {
  HookCall,
  HookInvocation,
  HookOutcome,
  Json,
} from '@repo/contracts/plugins/hook-protocol';
import type {
  Hook,
  HookArgs,
  HookContext,
  HookEvent,
  HookEventName,
} from '@repo/contracts/plugins/hooks';
import type { Kit } from '../kit/plugin-kit';

type SendHookCall = (call: HookCall) => Promise<Json>;

// A Hook as the worker keeps it: its event and answers cross as JSON, which the Server checks.
type JsonHook = (
  context: HookContext<HookEventName>,
  event: Json,
  next: (event?: Json) => Promise<Json>,
) => Json | undefined | Promise<Json | undefined>;

// The Server checks a `ui.render` event against its slot before it invokes a Hook on it.
type Invocation = HookInvocation &
  (
    | { name: 'ui.render'; event: HookEvent<'ui.render'> }
    | { name: Exclude<HookEventName, 'ui.render'> }
  );

type Run = { send: SendHookCall; kit: Kit; invocation: Invocation };

type HookDispatcher = { on: Argo['on']; inbox: (json: string) => void };

// `argo.on`, and the inbox the worker sends each invocation to by the `hookId` its registration got.
export function hookDispatcher(send: SendHookCall, kit: Kit): HookDispatcher {
  const hooks: JsonHook[] = [];

  return {
    on: registrar(send, hooks),
    inbox: (json) =>
      runHook({ send, kit, invocation: JSON.parse(json) }, hooks),
  };
}

const hookFirst = (
  args: HookArgs<JsonHook>,
): args is Extract<HookArgs<JsonHook>, [JsonHook, ...unknown[]]> =>
  typeof args[0] === 'function';

function registrar(send: SendHookCall, hooks: JsonHook[]): Argo['on'] {
  function on<Name extends HookEventName>(
    name: Name,
    ...args: HookArgs<Hook<Name>>
  ): Promise<void>;
  async function on(
    name: HookEventName,
    ...args: HookArgs<JsonHook>
  ): Promise<void> {
    await send(registration(hooks, name, args));
  }

  return on;
}

// A Hook is named to the Server by its count of `argo.on` calls.
function registration(
  hooks: JsonHook[],
  name: HookEventName,
  args: HookArgs<JsonHook>,
): HookCall {
  const [matcher, hook, options] = hookFirst(args)
    ? [undefined, ...args]
    : args;

  const hookId = hooks.push(hook) - 1;
  const guard = options?.guard === true;

  return { action: 'register', hookId, name, matcher, guard };
}

// Runs one invocation after the current task, then settles it with what the Hook answered or threw.
function runHook(run: Run, hooks: JsonHook[]): void {
  const { invocation } = run.invocation;

  const settle = async (outcome: HookOutcome): Promise<void> => {
    await run.send({ action: 'settle', invocation, outcome }).catch(() => null);
  };

  void Promise.resolve()
    .then(() => answerOf(run, hooks[run.invocation.hookId]))
    .then(
      (answer) =>
        settle(answer === undefined ? { ok: true } : { ok: true, answer }),
      (error) =>
        settle({ ok: false, error: String(error ? error.message : error) }),
    );
}

async function answerOf(
  { send, kit, invocation }: Run,
  hook: JsonHook | undefined,
): Promise<Json | undefined> {
  // The Server only invokes Hooks it registered; a missing one fails as calling it would.
  if (!hook) throw new TypeError('hooks[hookId] is not a function');

  const answer = await hook(
    contextOf(invocation),
    eventOf(invocation),
    nextOf(send, invocation),
  );

  return replacementOf(kit, invocation, answer);
}

// `next()` passes the event on as it came.
const nextOf =
  (send: SendHookCall, { invocation, event }: Invocation) =>
  (rewritten: Json = event): Promise<Json> =>
    send({ action: 'next', invocation, event: rewritten });

// Kit components a `ui.render` Hook answers with become the replacement the slot draws.
const replacementOf = (
  kit: Kit,
  { name, invocation }: Invocation,
  answer: Json | undefined,
): Json | undefined =>
  name === 'ui.render' && kit.isElement(answer)
    ? kit.replacement(invocation, answer)
    : answer;

const contextOf = (invocation: Invocation): HookContext<HookEventName> =>
  deepFreeze({
    name: invocation.name,
    surface: invocation.surface,
    props: invocation.name === 'ui.render' ? invocation.event.props : undefined,
  });

// A `ui.render` event is the slot's input, which the Hook reads but may only rewrite through `next`.
const eventOf = ({ name, event }: Invocation): Json =>
  name === 'ui.render' ? deepFreeze(event) : event;

function deepFreeze<Value>(value: Value): Value {
  if (!value || typeof value !== 'object') return value;

  freezeAll(Object.values(value));

  return Object.freeze(value);
}

function freezeAll(values: unknown[]): void {
  for (const value of values) deepFreeze(value);
}
