import type { HookEventName } from '@repo/contracts/plugins';
import type {
  HookInvocation,
  HookOutcome,
  Json,
  JsonObject,
} from '@repo/contracts/plugins/hook-protocol';
import { hookBudgetMs } from '@repo/contracts/plugins/hook-protocol';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { realClock, type PluginClock } from '../clock';
import { answerHook } from './hook-answer';
import type { RegisteredHook } from './hook-registry';
import { coreAnswer } from './hook-rules';
import {
  discardUnusedReplacements,
  type RetainedReplacement,
} from './render-answer';
import { logShadowed, passOn } from './render-log';
import { RunningHook, type HookStep } from './running-hook';

export type HookChainInput = {
  clock?: PluginClock;
  send: (hook: RegisteredHook, invocation: HookInvocation) => void;
  log: (line: string) => void;
  discard?: (pluginId: string, path: string) => void;
};

// Which worker a `next` or an outcome came from: only the worker running that Hook may send them.
export type HookCaller = { pluginId: string; generation: number };

// `ancestors` are the Plugins whose Hooks are waiting on this chain: their own calls started it.
type Chain = {
  clock: PluginClock;
  name: HookEventName;
  hooks: readonly RegisteredHook[];
  ancestors: ReadonlySet<string>;
  surface?: PluginSurface;
  replacements: RetainedReplacement[];
};

// Runs Hooks as a middleware chain over core (ADR-0027), one worker call per Hook.
export class HookChain {
  private readonly running = new Map<number, RunningHook>();
  private nextInvocation = 0;

  public constructor(private readonly input: HookChainInput) {}

  public async run(
    input: Omit<Chain, 'replacements' | 'clock'>,
    event: JsonObject,
  ): Promise<Json> {
    const chain = chainOf(input, this.input.clock ?? realClock);

    let answer: Json = null;

    try {
      answer = await this.from(chain, 0)(event);

      return answer;
    } finally {
      logShadowed(this.input.log, chain, { event, answer });
      discardUnusedReplacements(chain.replacements, answer, this.input.discard);
    }
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
      const below = this.from(chain, index + 1);
      const rest = passOn(this.input.log, hook, { ...chain, event, below });

      return this.invoke(hook, { ...chainStep(chain), event, rest }, chain);
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
      return await answerHook(running, await running.outcome(), this.input.log);
    } finally {
      this.running.delete(invocation);
    }
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
  { ancestors, clock }: Chain,
): RunningHook =>
  new RunningHook({
    hook,
    step,
    ancestors,
    budgetMs: hookBudgetMs[step.name],
    clock,
  });

const invocationOf = (
  invocation: number,
  { hookId }: RegisteredHook,
  { name, event, surface }: HookStep,
): HookInvocation => ({ invocation, hookId, name, event, surface });

const isRunBy = ({ hook }: RunningHook, caller: HookCaller): boolean =>
  hook.pluginId === caller.pluginId && hook.generation === caller.generation;

const chainStep = ({
  name,
  surface,
  replacements,
}: Chain): Pick<HookStep, 'name' | 'surface' | 'replacements'> => ({
  name,
  surface,
  replacements,
});

const chainOf = (
  input: Omit<Chain, 'replacements' | 'clock'>,
  clock: PluginClock,
): Chain => ({ ...input, replacements: [], clock });
