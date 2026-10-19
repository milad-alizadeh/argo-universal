import {
  hookEvents,
  type CoreHooks,
  type HookEventName,
} from '@repo/contracts/plugins';
import { JsonObject, type Json } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';
import { runtimeError } from '../protocol/runtime-protocol';
import { coreAnswer, isAnswer } from './hook-rules';

// Runs one event's Hook chain on JSON: the Server's runner, or core alone.
type HookRunner = (name: HookEventName, event: JsonObject) => Promise<Json>;

// The Server's runner, and where it logs a chain that failed as a whole.
type AttachedRunner = { run: HookRunner; log: (line: string) => void };

type EventSchemas<Event, Answer> = {
  event: z.ZodType<Event>;
  answer: z.ZodType<Answer>;
};

// Core's events cross into the chain as JSON, and the chain's answer comes back checked.
const typed =
  <Event extends object, Answer>(
    name: HookEventName,
    schemas: EventSchemas<Event, Answer>,
    run: HookRunner,
  ) =>
  async (event: Event): Promise<Answer> =>
    schemas.answer.parse(
      await run(name, JsonObject.parse(JSON.parse(JSON.stringify(event)))),
    );

const typedHooks = (run: HookRunner): CoreHooks => ({
  'session.start': typed('session.start', hookEvents['session.start'], run),
  'prompt.submit': typed('prompt.submit', hookEvents['prompt.submit'], run),
  'tool.check': typed('tool.check', hookEvents['tool.check'], run),
  'turn.complete': typed('turn.complete', hookEvents['turn.complete'], run),
  'process.spawn': typed('process.spawn', hookEvents['process.spawn'], run),
});

/*
 * Where core reaches Plugin Hooks. Sessions start before the Plugin runtime, so the runtime's
 * runner attaches later; until it does, and after it detaches, core answers alone.
 */
export class HookPort {
  public readonly hooks: CoreHooks = typedHooks((name, event) =>
    this.run(name, event),
  );

  private runner: AttachedRunner | null = null;

  public attach(runner: AttachedRunner): void {
    this.runner = runner;
  }

  public detach(): void {
    this.runner = null;
  }

  private async run(name: HookEventName, event: JsonObject): Promise<Json> {
    if (!this.runner) return coreAnswer(name, event);

    try {
      return checkedAnswer(name, await this.runner.run(name, event));
    } catch (error) {
      this.runner.log(
        `${name} Hooks failed, so core answered alone: ${runtimeError(error)}`,
      );

      return coreAnswer(name, event);
    }
  }
}

// The chain checks every Hook's answer; this holds core to the same shape.
function checkedAnswer(name: HookEventName, answer: Json): Json {
  if (!isAnswer(name, answer))
    throw new Error(`the ${name} chain answered the wrong shape`);

  return answer;
}
