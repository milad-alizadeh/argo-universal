import type { HookEventName } from '@repo/contracts/plugins';
import type {
  HookInvocation,
  HookOutcome,
  Json,
  JsonObject,
} from '@repo/contracts/plugins/hook-protocol';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { failureLine } from './hook-failure';
import type { RegisteredHook } from './hook-registry';
import { coreAnswer, guardRefusal, isAnswer } from './hook-rules';
import { readRenderAnswer } from './render-answer';
import { RunningHook, type HookStep } from './running-hook';

// A Hook's own time, as Claude Code allows it; waits on `next` and `argo` calls don't count.
const hookBudgetMs = 10_000;

export type HookChainInput = {
  send: (hook: RegisteredHook, invocation: HookInvocation) => void;
  log: (line: string) => void;
};

// Which worker a `next` or an outcome came from: only the worker running that Hook may send them.
export type HookCaller = { pluginId: string; generation: number };

// `ancestors` are the Plugins whose Hooks are waiting on this chain: their own calls started it.
type Chain = {
  name: HookEventName;
  hooks: readonly RegisteredHook[];
  ancestors: ReadonlySet<string>;
  surface?: PluginSurface;
};

// Runs Hooks as a middleware chain over core (ADR-0027), one worker call per Hook.
export class HookChain {
  private readonly running = new Map<number, RunningHook>();
  private nextInvocation = 0;

  public constructor(private readonly input: HookChainInput) {}

  public run(chain: Chain, event: JsonObject): Promise<Json> {
    return this.from(chain, 0)(event);
  }

  public next(
    caller: HookCaller,
    invocation: number,
    event: Json,
  ): Promise<Json> {
    return this.runningFor(caller, invocation).next(event);
  }

  public settle(
    caller: HookCaller,
    invocation: number,
    outcome: HookOutcome,
  ): void {
    this.runningFor(caller, invocation).settle(outcome);
  }

  // A Plugin's call made while its Hooks run belongs to their chains: neither it nor their ancestors may hook it again.
  public ancestorsOf(pluginId: string): Set<string> {
    const waiting = [...this.running.values()].filter(
      (running) => running.hook.pluginId === pluginId,
    );

    return new Set([
      pluginId,
      ...waiting.flatMap(({ ancestors }) => [...ancestors]),
    ]);
  }

  // A Plugin's `argo` call may be made by its running Hooks, so none of them is charged for the wait.
  public whileCalling<T>(pluginId: string, call: Promise<T>): Promise<T> {
    return [...this.running.values()]
      .filter((running) => running.hook.pluginId === pluginId)
      .reduce((work, running) => running.waitingOn(work), call);
  }

  // A stopped, reloaded or crashed worker's running Hooks fail, so their chains go on.
  public release(pluginId: string): void {
    for (const running of this.running.values())
      if (running.hook.pluginId === pluginId)
        running.fail('the Plugin stopped');
  }

  private from(chain: Chain, index: number) {
    return async (event: JsonObject): Promise<Json> => {
      const hook = chain.hooks[index];

      if (!hook) return coreAnswer(chain.name, event);
      const rest = this.from(chain, index + 1);

      return this.invoke(
        hook,
        { name: chain.name, event, rest, surface: chain.surface },
        chain,
      );
    };
  }

  private async invoke(
    hook: RegisteredHook,
    step: HookStep,
    chain: Chain,
  ): Promise<Json> {
    const invocation = this.nextInvocation++;
    const running = runningHook(hook, step, chain);

    this.running.set(invocation, running);
    this.input.send(hook, invocationOf(invocation, hook, step));

    try {
      return await this.answerOf(running, await running.outcome());
    } finally {
      this.running.delete(invocation);
    }
  }

  private answerOf(running: RunningHook, outcome: HookOutcome): Promise<Json> {
    if (!outcome.ok) return this.failed(running, outcome.error);

    return outcome.answer === undefined
      ? this.passedOnOrFailed(running)
      : this.answered(running, outcome.answer);
  }

  // Returning nothing after `next` answers what the rest of the chain answered.
  private passedOnOrFailed(running: RunningHook): Promise<Json> {
    return (
      running.passedOn() ??
      this.failed(running, 'returned without calling next or answering')
    );
  }

  private async answered(running: RunningHook, answer: Json): Promise<Json> {
    const valid = await validatedAnswer(running, answer);

    return valid ?? this.failed(running, 'answered the wrong shape');
  }

  // A failed Hook is skipped, unless it guards: then its event's refusal is the answer.
  private async failed(running: RunningHook, reason: string): Promise<Json> {
    const refusal = refusalOf(running);

    this.input.log(failureLine(running, reason, refusal !== undefined));

    return refusal ?? skipped(running);
  }

  private runningFor(caller: HookCaller, invocation: number): RunningHook {
    const running = this.running.get(invocation);

    if (!running || !isRunBy(running, caller))
      throw new Error('No such Hook is running');

    return running;
  }
}

const runningHook = (
  hook: RegisteredHook,
  step: HookStep,
  { ancestors }: Chain,
): RunningHook =>
  new RunningHook({ hook, step, ancestors, budgetMs: hookBudgetMs });

const invocationOf = (
  invocation: number,
  { hookId }: RegisteredHook,
  { name, event, surface }: HookStep,
): HookInvocation => ({ invocation, hookId, name, event, surface });

const isRunBy = ({ hook }: RunningHook, caller: HookCaller): boolean =>
  hook.pluginId === caller.pluginId && hook.generation === caller.generation;

const refusalOf = ({ hook, step }: RunningHook): Json | undefined =>
  hook.guard ? guardRefusal(step.name) : undefined;

// A skipped Hook leaves the event as it came: the chain goes on beneath it, once.
const skipped = (running: RunningHook): Promise<Json> =>
  running.passedOn() ?? running.step.rest(running.step.event);

async function validatedAnswer(
  running: RunningHook,
  answer: Json,
): Promise<Json | null> {
  if (running.step.name === 'ui.render')
    return readRenderAnswer(running, answer);

  return isAnswer(running.step.name, answer) ? answer : null;
}
