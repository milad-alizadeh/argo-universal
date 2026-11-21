import type {
  RunOutput,
  RunOutputCursor,
  ShellTerminal,
  TerminalReadResult,
  TerminalSendResult,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { shellTerminalOutputPath } from '../lib/terminal-owner';
import type { RunBlocks, RunPorts } from './run-blocks';
import type { RunLifecycle } from './run-lifecycle';
import { createRunOutput, removeRunOutput } from './run-output';
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
  ownerRecord: Promise<(() => Promise<void>) | null>;
  stopping?: Promise<void>;
};

const sameCheckout = (left: RunCheckout, right: RunCheckout): boolean =>
  left.projectId === right.projectId &&
  left.checkoutPath === right.checkoutPath;

const defaultScrollbackLines = 100;

type ShellServices = {
  lifecycle: RunLifecycle;
  blocks: RunBlocks;
  changed: (checkout: RunCheckout) => void;
};

type ShellRequest = {
  checkout: RunCheckout;
  ownerId: string;
  shell: ShellTerminal;
};

export class ShellTerminals {
  private readonly updates = new RunUpdates();
  private readonly live = new Map<string, OpenShell>();
  private readonly pending = new Map<
    string,
    { checkout: RunCheckout; ownerId: string; opening: Promise<ShellTerminal> }
  >();

  public constructor(
    private readonly input: Pick<
      RunsInput,
      'createId' | 'home' | 'spawn' | 'recordShellOwner'
    >,
    private readonly services: ShellServices,
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

    const opening = this.services.lifecycle
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
    const ports = await this.services.blocks.reserve(checkout, { name });
    const entry = await this.spawn({ checkout, ownerId, shell }, ports);
    this.observe(entry);
    await this.confirmOwner(entry);
    this.services.changed(checkout);

    return shell;
  }

  private async spawn(
    { checkout, ownerId, shell }: ShellRequest,
    { port, block, env }: RunPorts,
  ): Promise<OpenShell> {
    const { id, name, cwd } = shell;
    const path = shellTerminalOutputPath(this.input.home, id);
    await createRunOutput(path);

    try {
      const terminal = await this.input.spawn({
        id,
        cwd,
        command: '',
        env,
        port,
        shell: { outputPath: path },
      });

      return {
        shell,
        record: { ...checkout, name, port },
        ownerId,
        block,
        starter: name,
        terminal,
        recording: new TerminalRecording(path),
        closed: new AbortController(),
        ownerRecord:
          terminal.pid === undefined
            ? Promise.resolve(null)
            : this.input.recordShellOwner(terminal.pid, id),
      };
    } catch (error) {
      await removeRunOutput(path);
      throw error;
    }
  }

  private observe(entry: OpenShell): void {
    const { record, recording, shell, terminal } = entry;
    this.live.set(shell.id, entry);
    terminal.onData((data) => {
      recording.append(data);
      void recording
        .flushed()
        .then(() => this.updates.outputChanged(record, shell.id));
    });
    terminal.onExit(() => {
      if (!entry.stopping) void this.stop(entry).catch(() => {});
    });
  }

  private async confirmOwner(entry: OpenShell): Promise<void> {
    try {
      await entry.ownerRecord;
    } catch (error) {
      await this.stop(entry);
      throw error;
    }
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
    ownerRecord,
    recording,
    record,
    shell,
  }: OpenShell): Promise<void> {
    this.live.delete(shell.id);
    closed.abort();
    this.services.changed(record);
    await recording.dispose();
    await removeRunOutput(recording.path);
    const removeOwner = await ownerRecord.catch(() => null);
    await removeOwner?.();
  }
}
