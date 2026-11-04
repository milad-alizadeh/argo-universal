import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { KindTable, type Ending } from './kind-table';

// One Plugin's worker generation; an answer counts only from the generation its call went to.
export type Caller = { pluginId: string; generation: number };

// Why a call to a worker ended without its answer.
export type Ended = 'notRunning' | 'stopped' | 'late';

// The worker's answer, or why none came, with the Plugin it was asked of.
export type CallOutcome<Answer> =
  | { answered: Answer }
  | { ended: Ended; pluginId: string };

/*
 * One kind of call to a worker: the event it sends, how long its caller waits, and what its caller gets
 * from the worker's answer or from a call that ended without one.
 */
export type CallKind<Request, Answer, Result> = {
  event: (id: number, request: Request) => PluginEvent;
  limitMs: number;
  result: (outcome: CallOutcome<Answer>, request: Request) => Result;
};

/*
 * The calls of one kind: each sent to the running generation and answered by its id. A call given a null
 * limit waits with no deadline, until its answer or its generation's end.
 */
export type KindCalls<Request, Answer, Result> = {
  call: (
    pluginId: string,
    request: Request,
    limitMs?: number | null,
  ) => Promise<Result>;
  answer: (caller: Caller, answer: Answer) => void;
  // What a call still waiting on the caller's generation asked for, by its id.
  request: (caller: Caller, id: number) => Request | undefined;
  // Sends the generation a call still waits on a further event about it, by the call's id; none once it settled.
  tell: (request: Request, event: (id: number) => PluginEvent) => void;
};

export type WorkerTransport = {
  send: (pluginId: string, event: PluginEvent) => void;
  clock: PluginClock;
};

/*
 * Every call the runtime makes to Plugin workers (ADR-0035, ADR-0044, ADR-0050). It knows which generation
 * of each Plugin runs, sends each call to it with a deadline on the injected clock, routes the answer back
 * by kind and id, ignores an answer from an ended generation, and fails every waiting call when its
 * generation ends.
 */
export class WorkerCalls {
  private readonly running = new Map<string, number>();
  private readonly tables = new Set<Ending>();
  private readonly listeners = new Set<(pluginId: string) => void>();

  public constructor(private readonly transport: WorkerTransport) {}

  public generation(pluginId: string): number | undefined {
    return this.running.get(pluginId);
  }

  // The clock every call's deadline runs on, which a caller pacing its own sends shares.
  public get clock(): PluginClock {
    return this.transport.clock;
  }

  public current(caller: Caller): boolean {
    return this.running.get(caller.pluginId) === caller.generation;
  }

  // A generation that runs takes over; whatever still waits on the last one is stopped.
  public run(pluginId: string, generation: number): void {
    const last = this.running.get(pluginId);

    if (last === generation) return;

    if (last !== undefined) this.end(pluginId);

    this.running.set(pluginId, generation);
    this.notify(pluginId);
  }

  public release(pluginId: string): void {
    const wasRunning = this.running.delete(pluginId);

    this.end(pluginId);

    if (wasRunning) this.notify(pluginId);
  }

  // Hears each Plugin whose generation starts running or ends; the answer unsubscribes.
  public watch(listener: (pluginId: string) => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  public close(): void {
    this.running.clear();
    this.listeners.clear();

    for (const table of this.tables) table.end(() => true);
  }

  public kind<Request, Answer extends { id: number }, Result>(
    kind: CallKind<Request, Answer, Result>,
  ): KindCalls<Request, Answer, Result> {
    const generation = (pluginId: string): number | undefined =>
      this.generation(pluginId);

    const table = new KindTable(kind, { ...this.transport, generation });

    this.tables.add(table);

    return table;
  }

  private end(pluginId: string): void {
    for (const table of this.tables)
      table.end((caller) => caller.pluginId === pluginId);
  }

  private notify(pluginId: string): void {
    for (const listener of this.listeners) listener(pluginId);
  }
}
