import { randomUUID } from 'node:crypto';
import type { PluginDispatchResult } from '@repo/contracts/plugins/wire';

type Pending = {
  pluginId: string;
  viewId: string;
  finish: (result: PluginDispatchResult) => void;
};

type Dispatch = { requestId: string; answer: Promise<void> };

function completion(
  answer: ReturnType<typeof Promise.withResolvers<void>>,
): Pending['finish'] {
  return (result) => {
    if (result.ok) answer.resolve();
    else answer.reject(new Error(result.error));
  };
}

export class PluginDispatches {
  private readonly pending = new Map<string, Pending>();

  public wait(pluginId: string, viewId: string): Dispatch {
    const requestId = randomUUID();
    const answer = Promise.withResolvers<void>();
    this.pending.set(requestId, {
      pluginId,
      viewId,
      finish: completion(answer),
    });

    return { requestId, answer: answer.promise };
  }

  public settle(
    pluginId: string,
    requestId: string,
    result: PluginDispatchResult,
  ): void {
    const pending = this.pending.get(requestId);

    if (pending?.pluginId !== pluginId) return;
    this.pending.delete(requestId);
    pending.finish(result);
  }

  public end(viewId: string): void {
    for (const [id, pending] of this.pending)
      if (pending.viewId === viewId)
        this.settle(pending.pluginId, id, {
          ok: false,
          error: 'Plugin view closed or restarted',
        });
  }
}
