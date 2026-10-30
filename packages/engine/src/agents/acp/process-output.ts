import { Readable, Writable } from 'node:stream';
import {
  ndJsonStream,
  type AnyMessage,
  type Stream,
} from '@agentclientprotocol/sdk';
import {
  exitNotice,
  missingExecutableIn,
  type ExitNotice,
} from './exit-notice';
import type { AcpChild } from './process';

export const exitDrainMs = 250;

// The Notice shows only the stderr tail; an idle Agent can log for hours.
const stderrLimit = 16_384;

export class AgentProcessExitError extends Error {
  // The command the Agent could not find, when that is why it exited.
  public readonly missingExecutable: string | undefined;
  public get notice(): ExitNotice {
    return exitNotice(this.message, this.stderr, this.missingExecutable);
  }
  public constructor(
    public readonly code: number | null,
    signal: NodeJS.Signals | null,
    public readonly stderr: string,
  ) {
    super(
      signal
        ? `Agent exited by signal ${signal}`
        : `Agent exited with status ${code}`,
    );
    this.missingExecutable = missingExecutableIn(stderr);
  }
}

const processOutputStream = (child: AcpChild): ReadableStream<Uint8Array> => {
  const bridge = new TransformStream<Uint8Array, Uint8Array>();
  child.once('error', (error) => {
    void bridge.writable.abort(error).catch(() => {});
  });
  void Readable.toWeb(child.stdout)
    .pipeTo(bridge.writable)
    .catch(() => {});

  return bridge.readable;
};

export class ProcessOutput {
  private stderr = '';
  private failure: Error = new Error('Agent connection closed');
  private readonly closed = Promise.withResolvers<void>();
  public constructor(private readonly child: AcpChild) {
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      this.stderr = (this.stderr + chunk).slice(-stderrLimit);
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
    // The status is known now; a connection that closes during the drain still reports it.
    this.failure = new AgentProcessExitError(code, signal, this.stderr.trim());
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
