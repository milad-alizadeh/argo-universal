import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn, type IPty } from 'node-pty';
import type {
  AgentLaunch,
  LaunchLoginTerminal,
  LoginTerminalProcess,
} from '../agents';
import { ResourceCleanupError } from '../lib/resource-cleanup-error';
import { resolveRuntimeDirectory } from '../server-runtime';
import { TerminalChannel } from './terminal-channel';
import { releaseTerminalGroup } from './terminal-process-group';
import {
  recordTerminalGroup,
  removeTerminalRecord,
  terminalRecordPath,
} from './terminal-record';
const terminalCols = 80;
const terminalRows = 24;
const wrapper = fileURLToPath(
  new URL('./terminal-wrapper.mjs', import.meta.url),
);
const spawnTerminal = (
  launch: AgentLaunch,
  token: string,
  address: string,
): IPty =>
  spawn(process.execPath, [wrapper, address, token], {
    cwd: launch.cwd,
    env: { TERM: 'xterm-256color' },
    name: 'xterm-256color',
    cols: terminalCols,
    rows: terminalRows,
  });
class OwnedLoginTerminal {
  private readonly exited: Promise<void>;
  private readonly data: { dispose: () => void };
  private record?: string;
  private closing?: Promise<void>;
  public constructor(
    private readonly child: IPty,
    private readonly channel: TerminalChannel,
    output: (text: string) => void,
  ) {
    this.exited = new Promise((resolve) => {
      child.onExit(() => resolve());
    });
    this.data = child.onData(output);
  }
  public async open(
    launch: AgentLaunch,
    token: string,
  ): Promise<LoginTerminalProcess> {
    try {
      const home = resolveRuntimeDirectory();
      this.record = terminalRecordPath(home, token);
      await recordTerminalGroup(home, { pid: this.child.pid, token });
      await this.channel.launch(launch);
      return this.port();
    } catch (error) {
      return this.failedOpening(error);
    }
  }
  private async failedOpening(error: unknown): Promise<never> {
    const cleanup = this.close();
    await cleanup.catch((cause: unknown) => {
      throw new ResourceCleanupError(cleanup, cause);
    });
    throw error;
  }
  private port(): LoginTerminalProcess {
    return {
      exited: this.channel.exited(),
      write: (text) => this.child.write(text),
      resize: (cols, rows) => this.child.resize(cols, rows),
      close: () => this.close(),
    };
  }
  public close(): Promise<void> {
    this.closing ??= this.release();
    return this.closing;
  }
  private async release(): Promise<void> {
    await releaseTerminalGroup(this.child.pid);
    await this.exited;
    await this.channel.close();
    this.data.dispose();
    if (this.record) await removeTerminalRecord(this.record);
  }
}
export const launchLoginTerminal: LaunchLoginTerminal = async (
  launch,
  output,
) => {
  if (process.platform === 'win32')
    throw new Error('Terminal sign-in is unavailable on this Server');
  const token = randomUUID();
  const channel = new TerminalChannel(token);
  try {
    return await openOwnedTerminal(launch, { token, channel, output });
  } catch (error) {
    await channel.close();
    throw error;
  }
};
type TerminalOpening = {
  token: string;
  channel: TerminalChannel;
  output: (text: string) => void;
};
const openOwnedTerminal = async (
  launch: AgentLaunch,
  opening: TerminalOpening,
): Promise<LoginTerminalProcess> => {
  const { token, channel, output } = opening;
  const child = spawnTerminal(launch, token, await channel.listen());
  return new OwnedLoginTerminal(child, channel, output).open(launch, token);
};
