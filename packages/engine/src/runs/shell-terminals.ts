import type {
  RunOutput,
  RunOutputCursor,
  ShellTerminal,
  TerminalReadResult,
  TerminalSendResult,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { RunBlocks } from './run-blocks';
import type { RunLifecycle } from './run-lifecycle';
import { createRunOutput, removeRunOutput, runOutputPath } from './run-output';
import { watchRunOutput } from './run-replay';
import { RunUpdates } from './run-updates';
import type { RunCheckout, RunsInput } from './runs';
import type { TerminalProcess } from './terminal';
import { TerminalRecording } from './terminal-recording';

type OpenShell = {
  shell: ShellTerminal;
  record: RunCheckout & { name: string; port: number };
  ownerId: string;
  block: number;
  starter: string;
  terminal: TerminalProcess;
  recording: TerminalRecording;
  closed: AbortController;
  stopping?: Promise<void>;
};

const sameCheckout = (left: RunCheckout, right: RunCheckout): boolean =>
  left.projectId === right.projectId &&
  left.checkoutPath === right.checkoutPath;

const defaultScrollbackLines = 100;

export class ShellTerminals {
  private readonly updates = new RunUpdates();
  private readonly live = new Map<string, OpenShell>();
  private readonly pending = new Map<
    string,
    { checkout: RunCheckout; ownerId: string; opening: Promise<ShellTerminal> }
  >();

  public constructor(
    private readonly input: Pick<RunsInput, 'createId' | 'home' | 'spawn'>,
    private readonly lifecycle: RunLifecycle,
    private readonly blocks: RunBlocks,
    private readonly changed: (checkout: RunCheckout) => void,
  ) {}

  public holdings(): Iterable<OpenShell> {
    return this.live.values();
  }

  public rows(checkout: RunCheckout): ShellTerminal[] {
    return this.live
      .values()
      .filter(({ record }) => sameCheckout(record, checkout))
      .map(({ shell }) => shell)
      .toArray();
  }

  public open(checkout: RunCheckout, ownerId: string): Promise<ShellTerminal> {
    const id = this.input.createId();
    const opening = this.lifecycle
      .launchShell(checkout, () => this.launch(checkout, ownerId, id))
      .finally(() => this.pending.delete(id));
    this.pending.set(id, { checkout, ownerId, opening });

    return opening;
  }

  public async read(
    checkout: RunCheckout,
    id: string,
    scrollback = defaultScrollbackLines,
  ): Promise<TerminalReadResult> {
    const { shell, recording } = this.require(checkout, id);
    const drawn = await recording.screen.read(scrollback);

    return { ...drawn, name: shell.name, status: 'ready', exitCode: null };
  }

  public send(
    checkout: RunCheckout,
    id: string,
    input: string,
  ): TerminalSendResult {
    const { terminal, shell } = this.require(checkout, id);
    terminal.write(input);

    return { name: shell.name, status: 'ready' };
  }

  public resize(
    checkout: RunCheckout,
    id: string,
    { columns, rows }: { columns: number; rows: number },
  ): void {
    const { terminal, recording } = this.require(checkout, id);
    recording.screen.resize(columns, rows);
    terminal.resize(columns, rows);
  }

  public watchOutput(
    checkout: RunCheckout,
    { shellId, cursor }: { shellId: string; cursor?: RunOutputCursor },
    signal: AbortSignal,
  ): AsyncIterable<RunOutput> {
    const { recording, closed } = this.require(checkout, shellId);

    return watchRunOutput(
      {
        current: () => ({ runId: shellId, path: recording.path }),
        listen: (changed) =>
          this.updates.listenToOutput(checkout, shellId, changed),
      },
      cursor,
      AbortSignal.any([signal, closed.signal]),
    );
  }

  private require(checkout: RunCheckout, id: string): OpenShell {
    const entry = this.live.get(id);

    if (!entry || !sameCheckout(entry.record, checkout) || entry.stopping)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No open shell Terminal in this Checkout.',
      });

    return entry;
  }

  public async close(checkout: RunCheckout, id: string): Promise<void> {
    const entry = this.live.get(id);

    if (entry && sameCheckout(entry.record, checkout)) await this.stop(entry);
  }

  public async closeOwners(ownerIds: ReadonlySet<string>): Promise<void> {
    await Promise.allSettled(
      this.pending
        .values()
        .filter(({ ownerId }) => ownerIds.has(ownerId))
        .map(({ opening }) => opening),
    );
    await Promise.all(
      this.live
        .values()
        .filter(({ ownerId }) => ownerIds.has(ownerId))
        .map((entry) => this.stop(entry)),
    );
  }

  public async closeCheckout(checkout: RunCheckout): Promise<void> {
    await Promise.allSettled(
      this.pending
        .values()
        .filter((entry) => sameCheckout(entry.checkout, checkout))
        .map(({ opening }) => opening),
    );
    await Promise.all(
      this.live
        .values()
        .filter(({ record }) => sameCheckout(record, checkout))
        .map((entry) => this.stop(entry)),
    );
  }

  public async closeAll(): Promise<void> {
    await Promise.allSettled(
      this.pending.values().map(({ opening }) => opening),
    );
    await Promise.all(this.live.values().map((entry) => this.stop(entry)));
  }

  private async launch(
    checkout: RunCheckout,
    ownerId: string,
    id: string,
  ): Promise<ShellTerminal> {
    const name = this.nextName(checkout);
    const shell = { id, name, cwd: checkout.checkoutPath };
    const { block, port, env } = await this.blocks.reserve(
      checkout,
      { name },
      undefined,
    );
    const path = runOutputPath(this.input.home, id);
    await createRunOutput(path);
    let terminal: TerminalProcess;

    try {
      terminal = await this.input.spawn({
        id,
        cwd: shell.cwd,
        command: '',
        env,
        port,
        shell: true,
      });
    } catch (error) {
      await removeRunOutput(path);
      throw error;
    }
    const entry: OpenShell = {
      shell,
      record: { ...checkout, name, port },
      ownerId,
      block,
      starter: name,
      terminal,
      recording: new TerminalRecording(path),
      closed: new AbortController(),
    };
    this.live.set(id, entry);
    terminal.onData((data) => {
      entry.recording.append(data);
      void entry.recording
        .flushed()
        .then(() => this.updates.outputChanged(checkout, id));
    });
    terminal.onExit(() => {
      if (!entry.stopping) this.stop(entry).catch(() => {});
    });
    this.changed(checkout);

    return shell;
  }

  private nextName(checkout: RunCheckout): string {
    const names = new Set(this.rows(checkout).map(({ name }) => name));
    let number = 1;

    while (names.has(number === 1 ? 'Terminal' : `Terminal ${number}`))
      number += 1;

    return number === 1 ? 'Terminal' : `Terminal ${number}`;
  }

  private stop(entry: OpenShell): Promise<void> {
    entry.stopping ??= Promise.resolve().then(async () => {
      await entry.terminal.stop();
      await this.remove(entry);
    });

    return entry.stopping;
  }

  private async remove({
    closed,
    recording,
    record,
    shell,
  }: OpenShell): Promise<void> {
    this.live.delete(shell.id);
    closed.abort();
    this.changed(record);
    await recording.dispose();
    await removeRunOutput(recording.path);
  }
}
