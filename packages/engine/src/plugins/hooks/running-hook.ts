import type { HookEventName } from '@repo/contracts/plugins';
import type {
  HookOutcome,
  Json,
  JsonObject,
} from '@repo/contracts/plugins/hook-protocol';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { HookBudget } from './hook-budget';
import type { RegisteredHook } from './hook-registry';
import { readRewrite } from './hook-rules';

// One link of a chain: the event as this Hook received it, and the rest of the chain beneath it.
export type HookStep = {
  name: HookEventName;
  surface?: PluginSurface;
  event: JsonObject;
  rest: (event: JsonObject) => Promise<Json>;
};

type RunningHookInput = {
  hook: RegisteredHook;
  step: HookStep;
  budgetMs: number;
  // The Plugins whose Hooks this chain runs inside of.
  ancestors: ReadonlySet<string>;
};

// One Hook while it runs in its worker: it may call `next` once, then ends with an outcome.
export class RunningHook {
  public readonly hook: RegisteredHook;
  public readonly step: HookStep;
  public readonly ancestors: ReadonlySet<string>;
  private readonly budget: HookBudget;
  private readonly ending = Promise.withResolvers<HookOutcome>();
  private nextAnswer: Promise<Json> | null = null;
  private ended = false;

  public constructor({ hook, step, budgetMs, ancestors }: RunningHookInput) {
    this.hook = hook;
    this.step = step;
    this.ancestors = ancestors;
    this.budget = new HookBudget(budgetMs, () =>
      this.fail(`missed its ${budgetMs} ms budget`),
    );
    this.budget.start();
  }

  public outcome(): Promise<HookOutcome> {
    return this.ending.promise;
  }

  // What the rest of the chain answered, once the Hook called `next`.
  public passedOn(): Promise<Json> | null {
    return this.nextAnswer;
  }

  public async next(rewrite: Json): Promise<Json> {
    this.requireOpen();
    const { name, event: original, rest } = this.step;
    const event = readRewrite({ name, original, rewrite });

    this.nextAnswer = rest(event);

    return this.waitingOn(this.nextAnswer);
  }

  // Time the Hook spends waiting on `next` or an `argo` call isn't its own.
  public async waitingOn<T>(work: Promise<T>): Promise<T> {
    this.budget.hold();

    try {
      return await work;
    } finally {
      this.budget.release();
    }
  }

  public settle(outcome: HookOutcome): void {
    if (this.ended) return;
    this.ended = true;
    this.budget.stop();
    this.ending.resolve(outcome);
  }

  public fail(error: string): void {
    this.settle({ ok: false, error });
  }

  private requireOpen(): void {
    if (this.ended) throw new Error('The Hook has already ended');

    if (this.nextAnswer) throw new Error('next was already called');
  }
}
