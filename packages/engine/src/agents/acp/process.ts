import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import {
  ndJsonStream,
  type AnyMessage,
  type Stream,
} from '@agentclientprotocol/sdk';
import type { AgentLaunch } from '..';
import { shellEnvironment } from '../launch/shell-env';
import { vendorEnvironment } from '../vendor';
import type { AcpProcess } from './resource-types';

const exitDrainMs = 250;

export class AgentProcessExitError extends Error {
  public constructor(
    code: number | null,
    signal: NodeJS.Signals | null,
    public readonly stderr: string,
  ) {
    super(
      signal
        ? `Agent exited by signal ${signal}`
        : `Agent exited with status ${code}`,
    );
  }
}

const quote = (argument: string): string =>
  `'${argument.replaceAll("'", "'\\''")}'`;

const processOutputStream = (
  child: ChildProcessWithoutNullStreams,
): ReadableStream<Uint8Array> => {
  const bridge = new TransformStream<Uint8Array, Uint8Array>();
  child.once('error', (error) => {
    void bridge.writable.abort(error).catch(() => {});
  });
  void Readable.toWeb(child.stdout)
    .pipeTo(bridge.writable)
    .catch(() => {});

  return bridge.readable;
};

class ProcessOutput {
  private stderr = '';
  private failure: Error = new Error('Agent connection closed');
  private readonly closed = Promise.withResolvers<void>();
  public constructor(private readonly child: ChildProcessWithoutNullStreams) {
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      this.stderr += chunk;
    });
    child.once('close', () => this.closed.resolve());
  }
  public observeExit(): Promise<void> {
    const exited = Promise.withResolvers<void>();
    this.child.once('error', (error) => {
      this.failure = error;
      exited.resolve();
    });
    this.child.once('exit', (code, signal) => {
      void this.finishExit(code, signal).then(exited.resolve);
    });

    return exited.promise;
  }
  private async finishExit(
    code: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    await this.drain();
    this.failure = new AgentProcessExitError(code, signal, this.stderr.trim());
  }
  private async drain(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, exitDrainMs);
    });

    await Promise.race([this.closed.promise, deadline]);
    clearTimeout(timer);
  }
  private readonly observeMessage = (
    message: AnyMessage,
    controller: TransformStreamDefaultController<AnyMessage>,
  ): void => {
    this.stderr = '';
    controller.enqueue(message);
  };
  public stream(): Stream {
    const protocol = ndJsonStream(
      Writable.toWeb(this.child.stdin),
      processOutputStream(this.child),
    );

    return {
      ...protocol,
      readable: protocol.readable.pipeThrough(
        new TransformStream({ transform: this.observeMessage }),
      ),
    };
  }
  public exitError = (): Error => this.failure;
}

const ownProcess = (child: ChildProcessWithoutNullStreams): AcpProcess => {
  const output = new ProcessOutput(child);
  const exited = output.observeExit();

  return {
    stream: output.stream(),
    exited,
    exitError: output.exitError,
    terminate: async () => {
      child.kill('SIGTERM');
      await exited;
    },
  };
};

const spawnAgent = (
  launch: AgentLaunch,
  environment: NodeJS.ProcessEnv,
): ChildProcessWithoutNullStreams =>
  spawn(
    process.env.SHELL ?? '/bin/sh',
    ['-c', `exec ${[launch.executable, ...launch.args].map(quote).join(' ')}`],
    {
      cwd: launch.cwd,
      env: { ...environment, ...launch.env, ...vendorEnvironment(launch) },
      detached: false,
      stdio: 'pipe',
    },
  );

export const launchAcpProcess = async (
  launch: AgentLaunch,
): Promise<AcpProcess> =>
  ownProcess(spawnAgent(launch, await shellEnvironment(launch.cwd)));
