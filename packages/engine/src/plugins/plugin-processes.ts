import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { argoLimitBytes, argoTimeoutMs } from './plugin-limits.ts';
import type { ProcessCall, ProcessCommand } from './runtime-protocol.ts';

export type ProcessResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  timedOut: boolean;
};

type Running = { child: ChildProcess; done: Promise<ProcessResult> };

type Control = Extract<ProcessCall, { action: 'wait' | 'kill' }>;

type Run = { timedOut: boolean; truncated: boolean };

type Timer = ReturnType<typeof setTimeout>;

// A Plugin's commands: run by argv with no shell, output capped, killed at the timeout and when released.
export class PluginProcesses {
  private readonly running = new Map<string, Running>();
  private readonly live = new Set<ChildProcess>();
  private readonly timers = new Set<Timer>();

  async handle(call: ProcessCall): Promise<ProcessResult | string | null> {
    if (call.action === 'run') return this.start(call, argoTimeoutMs).done;

    if (call.action === 'spawn') return this.spawned(call);

    return this.control(call);
  }

  private control(call: Control): Promise<ProcessResult> | null {
    const running = this.running.get(call.id);

    if (!running) throw new Error(`Unknown process: ${call.id}`);

    return call.action === 'wait' ? running.done : kill(running);
  }

  release(): void {
    for (const child of this.live) killGroup(child);

    for (const timer of this.timers) clearTimeout(timer);
    this.running.clear();
    this.live.clear();
    this.timers.clear();
  }

  private spawned(command: ProcessCommand): string {
    const running = this.start(command, null);
    const id = randomUUID();
    this.running.set(id, running);

    // A spawned process nobody waits for must not turn its failure into an unhandled rejection.
    running.done.catch(() => {});

    return id;
  }

  private start(command: ProcessCommand, fallback: number | null): Running {
    const [file = '', ...args] = command.argv;

    const child = spawn(file, args, {
      cwd: command.cwd,
      shell: false,
      detached: true,
    });

    const run: Run = { timedOut: false, truncated: false };
    this.track(child);
    this.timeout(child, run, command.timeoutMs ?? fallback);
    child.stdin.on('error', () => {});
    child.stdin.end(command.input);

    return { child, done: this.finish(child, run) };
  }

  // Every child, run or spawned, stays known until it exits, so `release` can kill it.
  private track(child: ChildProcess): void {
    this.live.add(child);
    child.once('close', () => this.live.delete(child));
  }

  // A spawned process lives until it exits, is killed or is released; only a given timeout ends it sooner.
  private timeout(child: ChildProcess, run: Run, ms: number | null): void {
    if (ms === null) return;

    const timer = setTimeout(() => {
      run.timedOut = true;
      killGroup(child);
    }, ms);

    this.timers.add(timer);

    for (const event of ['close', 'error'])
      child.once(event, () => this.clear(timer));
  }

  private finish(child: ChildProcess, run: Run): Promise<ProcessResult> {
    const stdout = capture(child.stdout, run);
    const stderr = capture(child.stderr, run);

    return new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (exitCode) =>
        resolve({ exitCode, stdout: stdout(), stderr: stderr(), ...run }),
      );
    });
  }

  private clear(timer: Timer): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }
}

// The child leads its own process group, so its descendants die with it.
function killGroup({ pid }: ChildProcess): void {
  if (pid === undefined) return;

  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // Already gone.
  }
}

function kill(running: Running): null {
  killGroup(running.child);

  return null;
}

function capture(stream: NodeJS.ReadableStream | null, run: Run): () => string {
  const chunks: Buffer[] = [];
  let size = 0;

  stream?.on('data', (chunk: Buffer) => {
    const room = Math.max(argoLimitBytes - size, 0);

    if (chunk.length > room) run.truncated = true;
    chunks.push(chunk.subarray(0, room));
    size += Math.min(chunk.length, room);
  });

  return (): string => Buffer.concat(chunks).toString('utf8');
}
