import type { ShellTerminal } from '@repo/contracts';
import type { RunBlocks } from './run-blocks';
import type { RunLifecycle } from './run-lifecycle';
import type { RunCheckout, RunsInput } from './runs';
import type { TerminalProcess } from './terminal';

type OpenShell = {
  shell: ShellTerminal;
  record: RunCheckout & { name: string; port: number };
  ownerId: string;
  block: number;
  starter: string;
  terminal: TerminalProcess;
  stopping?: Promise<void>;
};

const sameCheckout = (left: RunCheckout, right: RunCheckout): boolean =>
  left.projectId === right.projectId &&
  left.checkoutPath === right.checkoutPath;

export class ShellTerminals {
  private readonly live = new Map<string, OpenShell>();
  private readonly pending = new Map<
    string,
    { checkout: RunCheckout; ownerId: string; opening: Promise<ShellTerminal> }
  >();

  public constructor(
    private readonly input: Pick<RunsInput, 'createId' | 'spawn'>,
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
    const terminal = await this.input.spawn({
      id,
      cwd: shell.cwd,
      command: '',
      env,
      port,
      shell: true,
    });
    const entry: OpenShell = {
      shell,
      record: { ...checkout, name, port },
      ownerId,
      block,
      starter: name,
      terminal,
    };
    this.live.set(id, entry);
    terminal.onExit(() => {
      if (!entry.stopping) this.remove(entry);
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
    entry.stopping ??= entry.terminal.stop().then(() => this.remove(entry));

    return entry.stopping;
  }

  private remove({ shell, record }: OpenShell): void {
    this.live.delete(shell.id);
    this.changed(record);
  }
}
