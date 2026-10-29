import { EventEmitter, on } from 'node:events';
import type {
  AgentOptionsUpdate,
  SessionAgentOptionsInput,
} from '@repo/contracts';
import { requireInstalledAgent } from '../../agents';
import {
  refreshAgentOptions,
  type OptionsDeps,
} from './agent-options-discovery';
import { discoveryFailure } from './agent-options-discovery-session';
import { savedAgentOptions, sessionOptionsInput } from './agent-options-input';
import { observeLiveAgentOptions } from './live-agent-options';

type ReadEvent = { update: AgentOptionsUpdate } | { error: unknown };

// One reader owns discovery, actor replacement, cancellation and publication precedence.
class AgentOptionsReader {
  private readonly events = new EventEmitter<{
    update: [ReadEvent];
    done: [];
  }>();
  private readonly controller = new AbortController();
  private readonly active: AbortSignal;
  private readonly stream: AsyncIterableIterator<ReadEvent[]>;
  private work = Promise.resolve();
  private unsubscribe = (): void => {};
  private previous = '';

  constructor(
    private readonly deps: OptionsDeps,
    private readonly input: SessionAgentOptionsInput,
    signal?: AbortSignal,
  ) {
    this.active = signal
      ? AbortSignal.any([signal, this.controller.signal])
      : this.controller.signal;
    this.stream = on(this.events, 'update', {
      signal: this.active,
      close: ['done'],
    });
  }

  async *read(): AsyncGenerator<AgentOptionsUpdate> {
    try {
      this.start();
      yield* this.readEvents();
    } finally {
      await this.close();
    }
  }

  private async *readEvents(): AsyncGenerator<AgentOptionsUpdate> {
    for await (const [event] of this.stream) {
      if (!event) continue;
      yield this.readUpdate(event);
    }
  }

  private readUpdate(event: ReadEvent): AgentOptionsUpdate {
    if ('error' in event) throw event.error;

    return event.update;
  }

  private start(): void {
    this.followSession();

    if (this.isLive()) return;
    const saved = savedAgentOptions(this.deps, this.input);
    this.publish({ update: saved });
    this.work = this.discover(saved);
  }

  private followSession(): void {
    const { sessionId } = this.input;

    if (!sessionId) return;
    this.unsubscribe = observeLiveAgentOptions({
      deps: this.deps,
      input: { ...this.input, sessionId },
      observer: {
        update: (update) => this.publish({ update }),
        done: () => {
          this.events.emit('done');
        },
      },
    });
  }

  private isLive(): boolean {
    const { sessionId } = this.input;

    return Boolean(
      sessionId && this.deps.sessions.getSnapshot().context.sessions[sessionId],
    );
  }

  private publish(event: ReadEvent): void {
    if ('error' in event) {
      this.events.emit('update', event);

      return;
    }

    const key = JSON.stringify(event.update);

    if (key === this.previous) return;
    this.previous = key;
    this.events.emit('update', event);
  }

  private discovered(update: AgentOptionsUpdate): void {
    if (this.isLive()) return;
    this.publish({ update });
  }

  private async discover(saved: AgentOptionsUpdate): Promise<void> {
    try {
      await this.refresh(saved);
    } catch (error) {
      this.failed(saved, error);
    } finally {
      if (!this.input.sessionId) this.events.emit('done');
    }
  }

  private async refresh(saved: AgentOptionsUpdate): Promise<void> {
    const configOptions = await refreshAgentOptions(this.deps, this.input, {
      signal: this.active,
      progress: (stage, progress) =>
        this.discovered({ ...this.snapshot(saved), stage, progress }),
    });

    this.discovered({ ...this.snapshot(saved), configOptions, stage: 'ready' });
  }

  private snapshot(saved: AgentOptionsUpdate): AgentOptionsUpdate {
    return {
      ...saved,
      commands: savedAgentOptions(this.deps, this.input).commands,
    };
  }

  private failed(saved: AgentOptionsUpdate, cause: unknown): void {
    if (this.isLive()) return;

    if (!this.input.sessionId) {
      this.publish({ error: cause });

      return;
    }

    this.discovered({
      ...this.snapshot(saved),
      error: discoveryFailure(cause),
    });
  }

  private async close(): Promise<void> {
    this.unsubscribe();
    this.controller.abort();
    await this.stream.return?.();
    await this.work;
  }
}

// The public read keeps its saved snapshot through refresh and recoverable Session failures.
export async function* agentOptionsUpdates(
  deps: OptionsDeps,
  request: SessionAgentOptionsInput,
  signal?: AbortSignal,
): AsyncGenerator<AgentOptionsUpdate, void> {
  const input = sessionOptionsInput(deps, request);
  requireInstalledAgent(deps.installedAgents, input.agent);
  yield* new AgentOptionsReader(deps, input, signal).read();
}
