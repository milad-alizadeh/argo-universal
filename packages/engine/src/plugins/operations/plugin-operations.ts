import type { PluginOperationCall } from '@repo/contracts/plugins/plugin-operations';
import {
  PluginOperationCalls,
  type Answer,
  type Caller,
  type Invocation,
  type OperationTransport,
} from './operation-calls';

type Request = Omit<Invocation, 'type' | 'id'>;

/*
 * The runtime side of a Plugin's own Operations (ADR-0044): one call per run, answered by the worker
 * generation it went to. A Plugin that is not running answers nothing, so the caller starts it first.
 */
export class PluginOperations {
  private readonly running = new Map<string, number>();
  private readonly calls: PluginOperationCalls;

  public constructor(transport: OperationTransport) {
    this.calls = new PluginOperationCalls(transport);
  }

  // A new worker generation takes over from the last one; its Operations answer once it runs.
  public activate(pluginId: string): void {
    this.running.delete(pluginId);
  }

  public ran(pluginId: string, generation: number): void {
    this.running.set(pluginId, generation);
  }

  public release(pluginId: string): void {
    this.running.delete(pluginId);
    this.calls.release(pluginId);
  }

  public run(pluginId: string, request: Request): Promise<Answer> {
    const generation = this.running.get(pluginId);

    if (generation === undefined)
      return Promise.resolve({
        ok: false,
        error: `Plugin ${pluginId} is not running`,
      });

    return this.calls.call({ pluginId, generation }, request);
  }

  // An answer from an ended worker is ignored.
  public receive(caller: Caller, call: PluginOperationCall): void {
    this.calls.settle(caller, call);
  }

  public close(): void {
    this.running.clear();
    this.calls.close();
  }
}

export type { Answer } from './operation-calls';
