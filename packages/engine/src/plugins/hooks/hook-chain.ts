import type { HookEventName } from '@repo/contracts/plugins';
import type {
  HookInvocation,
  HookOutcome,
  Json,
  JsonObject,
} from '@repo/contracts/plugins/hook-protocol';
import type { RegisteredHook } from './hook-registry';
import { coreAnswer, guardRefusal, isAnswer } from './hook-rules';
import { RunningHook, type HookStep } from './running-hook';

// Well inside the 3 seconds a starting Plugin has to answer, so a Plugin waiting on a chain never counts as hanging.
const hookBudgetMs = 1000;

export type HookChainInput = {
  send: (hook: RegisteredHook, invocation: HookInvocation) => void;
  log: (line: string) => void;
};

// Which worker a `next` or an outcome came from: only the worker running that Hook may send them.
export type HookCaller = { pluginId: string; generation: number };

type Chain = { name: HookEventName; hooks: readonly RegisteredHook[] };

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

  // A stopped, reloaded or crashed worker's running Hooks fail, so their chains go on.
  public release(pluginId: string): void {
    for (const running of this.running.values())
      if (running.hook.pluginId === pluginId)
        running.fail('the Plugin stopped');
  }

  private from({ name, hooks }: Chain, index: number) {
    return async (event: JsonObject): Promise<Json> => {
      const hook = hooks[index];

      if (!hook) return coreAnswer(name, event);
      const rest = this.from({ name, hooks }, index + 1);

      return this.invoke(hook, { name, event, rest });
    };
  }

  private async invoke(hook: RegisteredHook, step: HookStep): Promise<Json> {
    const invocation = this.nextInvocation++;
    const running = new RunningHook({ hook, step, budgetMs: hookBudgetMs });

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
    if (isAnswer(running.step.name, answer)) return answer;

    return this.failed(running, 'answered the wrong shape');
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

const invocationOf = (
  invocation: number,
  { hookId }: RegisteredHook,
  { name, event }: HookStep,
): HookInvocation => ({ invocation, hookId, name, event });

const isRunBy = ({ hook }: RunningHook, caller: HookCaller): boolean =>
  hook.pluginId === caller.pluginId && hook.generation === caller.generation;

const refusalOf = ({ hook, step }: RunningHook): Json | undefined =>
  hook.guard ? guardRefusal(step.name) : undefined;

// A skipped Hook leaves the event as it came: the chain goes on beneath it, once.
const skipped = (running: RunningHook): Promise<Json> =>
  running.passedOn() ?? running.step.rest(running.step.event);

const failureLine = (
  { hook, step }: RunningHook,
  reason: string,
  refused: boolean,
): string =>
  `Plugin ${hook.pluginId}: ${refused ? 'guard refused' : 'skipped'} ${step.name} Hook: ${reason}`;
