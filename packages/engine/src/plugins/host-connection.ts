import { fork, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createActor } from 'xstate';
import {
  hostLifecycleMachine,
  hostBudgetExhausted,
} from './host-lifecycle.machine';
import { HostMessage, type PluginEntry } from './runtime-protocol';

const closeLimitMs = 1000;

const hostStartupLimitMs = 10_000;

type HostCallbacks = {
  log: (line: string) => void;
  status: (message: Exclude<HostMessage, { type: 'ready' }>) => void;
  crash: (message: string) => void;
};

export class HostConnection {
  private child: ChildProcess | null = null;
  private readonly lifecycle;

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

  stop(pluginId: string): void {
    if (this.child?.connected)
      this.child.send({ type: 'stop', pluginId }, this.sendError);
  }

  async close(): Promise<void> {
    this.lifecycle.send({ type: 'host.close' });
    const child = this.child;

    if (!child) return;
    const exited = once(child, 'exit');
    const force = setTimeout(() => child.kill('SIGKILL'), closeLimitMs);
    child.kill();
    await exited.finally(() => clearTimeout(force));
  }

  private start(): void {
    this.child = fork(new URL('./host-process.ts', import.meta.url), [], {
      execArgv: [
        '--experimental-vm-modules',
        '--disable-warning=ExperimentalWarning',
      ],
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      env: hostEnvironment(),
    });
    this.listen(this.child);
    this.callbacks.log(`Plugin host started: ${this.child.pid}`);
  }

  private listen(child: ChildProcess): void {
    monitorStartup(child);
    child.on('message', (value) => this.message(HostMessage.parse(value)));
    child.on('error', (error) =>
      this.callbacks.log(`Plugin host error: ${error.message}`),
    );
    child.once('exit', (code, signal) =>
      this.exited(child, `${code ?? signal}`),
    );
    child.stderr?.on('data', (chunk: Buffer) =>
      this.callbacks.log(chunk.toString().trim()),
    );
  }

  private message(message: HostMessage): void {
    if (message.type === 'status') this.callbacks.status(message);
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

function hostEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };

  delete env.NODE_OPTIONS;

  return env;
}

function monitorStartup(child: ChildProcess): void {
  const deadline = setTimeout(() => child.kill('SIGKILL'), hostStartupLimitMs);

  child.once('message', () => clearTimeout(deadline));
  child.once('exit', () => clearTimeout(deadline));
}
