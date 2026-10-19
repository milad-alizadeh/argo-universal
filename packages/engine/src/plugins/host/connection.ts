import { fork, type ChildProcess } from 'node:child_process';
import { createActor } from 'xstate';
import {
  HostMessage,
  type HostCommand,
  type HostHook,
  type PluginEntry,
  type PluginEvent,
  type PluginReply,
} from '../protocol/runtime-protocol';
import { hostCompletion } from './completion';
import { hostLifecycleMachine, hostBudgetExhausted } from './lifecycle.machine';
import { TestRequests } from './test-requests';

export type PluginHostProcess = ChildProcess;

const closeLimitMs = 1000;

const hostStartupLimitMs = 10_000;

type HostCallbacks = {
  log: (line: string) => void;
  status: (message: Extract<HostMessage, { type: 'status' }>) => void;
  crash: (message: string) => void;
  call: (
    message: Extract<HostMessage, { type: 'call' }>,
  ) => Promise<PluginReply>;
};

export class HostConnection {
  private child: ChildProcess | null = null;
  readonly tests = new TestRequests((command) => this.tell(command));
  private readonly lifecycle;
  private completion: Promise<void> = Promise.resolve();

  constructor(private readonly callbacks: HostCallbacks) {
    this.lifecycle = createActor(hostLifecycleMachine, {
      input: {
        now: Date.now,
        start: (): void => this.start(),
        crash: callbacks.crash,
      },
    }).start();
  }

  activate(entry: PluginEntry): void {
    if (this.lifecycle.getSnapshot().matches('closed'))
      throw new Error('Plugin host is closed');

    if (this.lifecycle.getSnapshot().matches('exhausted'))
      throw new Error(hostBudgetExhausted);
    this.send(entry);
  }

  private send(entry: PluginEntry): void {
    if (!this.child?.connected) throw new Error('Plugin host is unavailable');

    this.child.send({ type: 'activate', ...entry }, this.sendError);
  }

  event(pluginId: string, event: PluginEvent): void {
    this.tell({ type: 'event', pluginId, event });
  }

  hook(hook: Omit<HostHook, 'type'>): void {
    this.tell({ type: 'hook', ...hook });
  }

  stop(pluginId: string): void {
    this.tell({ type: 'stop', pluginId });
  }

  // A command the host may miss while it restarts: the worker it names is gone too.
  tell(command: Exclude<HostCommand, { type: 'activate' }>): void {
    if (this.child?.connected) this.child.send(command, this.sendError);
  }

  async close(): Promise<void> {
    this.lifecycle.send({ type: 'host.close' });
    const child = this.child;

    if (!child) return;
    const completed = this.completion;
    const force = setTimeout(() => child.kill('SIGKILL'), closeLimitMs);
    child.kill();
    await completed.finally(() => clearTimeout(force));
  }

  private start(): void {
    const child = launchPluginHost();
    this.child = child;
    this.completion = hostCompletion(child, (reason) =>
      this.exited(child, reason),
    );
    this.listen(child);
  }

  private listen(child: ChildProcess): void {
    monitorStartup(child);
    child.once('spawn', () =>
      this.callbacks.log(`Plugin host started: ${child.pid}`),
    );
    child.on('message', (value) => this.receive(HostMessage.safeParse(value)));
    this.logOutput(child);
  }

  private logOutput(child: ChildProcess): void {
    child.on('error', (error) =>
      this.callbacks.log(`Plugin host error: ${error.message}`),
    );
    child.stderr?.on('data', (chunk: Buffer) =>
      this.callbacks.log(chunk.toString().trim()),
    );
  }

  private receive(parsed: ReturnType<typeof HostMessage.safeParse>): void {
    if (!parsed.success) return;

    if (parsed.data.type === 'test.done') this.tests.settle(parsed.data);
    else this.message(parsed.data);
  }

  private message(message: HostMessage): void {
    if (message.type === 'status') this.callbacks.status(message);
    else if (message.type === 'call') void this.answerCall(message);
  }

  private async answerCall(
    message: Extract<HostMessage, { type: 'call' }>,
  ): Promise<void> {
    const { pluginId, generation, id } = message;
    const reply = await this.callbacks.call(message);

    this.tell({ type: 'reply', pluginId, generation, id, reply });
  }

  private exited(child: ChildProcess, reason: string): void {
    if (child !== this.child) return;
    this.child = null;

    this.lifecycle.send({ type: 'host.exited', reason });
  }

  private readonly sendError = (error: Error | null): void => {
    if (error) this.callbacks.log(`Plugin host IPC: ${error.message}`);
  };
}

function launchPluginHost(): ChildProcess {
  return fork(new URL('./process.ts', import.meta.url), [], {
    execArgv: [
      '--experimental-vm-modules',
      '--disable-warning=ExperimentalWarning',
    ],
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: hostEnvironment(),
  });
}

function hostEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };

  delete env.NODE_OPTIONS;

  return env;
}

function monitorStartup(child: ChildProcess): void {
  const deadline = setTimeout(() => child.kill('SIGKILL'), hostStartupLimitMs);

  child.once('message', () => clearTimeout(deadline));
  child.once('close', () => clearTimeout(deadline));
}
