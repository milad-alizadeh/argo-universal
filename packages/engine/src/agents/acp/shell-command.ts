import type {
  CreateTerminalRequest,
  TerminalExitStatus,
} from '@agentclientprotocol/sdk';
import { z } from 'zod';
import type { AgentLaunch } from '../agent-launch';
import type { Serializable } from './process';
import type { ShellChild } from './process';
import { captureShellCommandOutput } from './shell-command-output';
import { releaseShellGroup } from './shell-process-group';
import { recordShellGroup, removeShellRecord } from './shell-record';
import { shellLaunchMessage, sendShellLaunch, shellPid } from './shell-start';

export type ShellCommand = {
  exited: Promise<TerminalExitStatus>;
  kill: () => boolean;
  isRunning: () => boolean;
};

export type ShellCommandInput = {
  request: CreateTerminalRequest;
  launch: AgentLaunch;
  cwd: string;
  home: string;
  output: (chunk: Buffer) => void | Promise<void>;
};

const ShellMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('started') }),
  z.object({ type: z.literal('failed'), message: z.string() }),
  z.object({
    type: z.literal('exited'),
    exitCode: z.number().nullable(),
    signal: z.string().nullable(),
  }),
]);

class OwnedShellCommand implements ShellCommand {
  private readonly result = Promise.withResolvers<TerminalExitStatus>();
  private readonly started = Promise.withResolvers<void>();
  private readonly spawned = Promise.withResolvers<void>();
  private status?: TerminalExitStatus;
  private closing?: Promise<void>;
  private record?: string;
  public readonly exited = this.result.promise;
  public constructor(
    private readonly child: ShellChild,
    private readonly output: Promise<void>,
  ) {
    child.once('spawn', () => this.spawned.resolve());
    child.once('error', (error) => this.spawned.reject(error));
    child.on('message', this.message);
    child.once('close', this.closed);
    void this.started.promise.catch(() => {});
    void this.exited.catch(() => {});
    void output.catch(() => this.kill());
  }
  private closed = (
    exitCode: number | null,
    signal: NodeJS.Signals | null,
  ): void => {
    this.started.reject(
      new Error('Shell wrapper exited before command startup'),
    );
    void this.finish({ exitCode, signal }).catch(this.result.reject);
  };
  public async launch(
    input: ShellCommandInput,
    options: { token: string; env: NodeJS.ProcessEnv },
  ): Promise<this> {
    await this.spawned.promise;

    try {
      await this.recordOwner(input.home, options.token);
      await sendShellLaunch(this.child, shellLaunchMessage(input, options.env));
      await this.started.promise;

      return this;
    } catch (error) {
      await this.release();
      throw error;
    }
  }
  private async recordOwner(home: string, token: string): Promise<void> {
    this.record = await recordShellGroup(home, {
      pid: shellPid(this.child),
      token,
    });
  }
  private message = (message: Serializable): void => {
    const parsed = ShellMessage.safeParse(message);

    if (parsed.success) {
      this.acceptMessage(parsed.data);
    } else {
      this.started.reject(new Error('Invalid Shell wrapper message'));
      this.kill();
    }
  };
  private acceptMessage(message: z.infer<typeof ShellMessage>): void {
    if (message.type === 'started') return this.started.resolve();

    if (message.type === 'failed')
      return this.started.reject(new Error(message.message));
    this.status = { exitCode: message.exitCode, signal: message.signal };
    this.kill();
  }
  public isRunning = (): boolean => !this.status && !this.closing;
  public kill = (): boolean => {
    if (this.closing) return false;
    void this.release().catch(this.result.reject);

    return true;
  };
  private release(): Promise<void> {
    this.closing ??= this.releaseOwnedGroup();

    return this.closing;
  }
  private async releaseOwnedGroup(): Promise<void> {
    if (this.child.pid) await releaseShellGroup(this.child.pid);

    if (this.record) await removeShellRecord(this.record);
  }
  private async finish(fallback: TerminalExitStatus): Promise<void> {
    await this.release();
    await this.output;
    this.result.resolve(this.status ?? fallback);
  }
}

export const observeShellCommand = (
  child: ShellChild,
  input: ShellCommandInput,
  options: { token: string; env: NodeJS.ProcessEnv },
): Promise<ShellCommand> => {
  child.stdin.end();
  const output = captureShellCommandOutput(child, input.output);

  return new OwnedShellCommand(child, output).launch(input, options);
};
