import type {
  RunOutput,
  RunOutputCursor,
  TerminalReadResult,
  TerminalSendResult,
} from '@repo/contracts';
import type { RunTerminals } from './run-terminals';
import type { RunCheckout } from './runs-input';
import type { ShellTerminals } from './shell-terminals';

type TerminalTarget = { name: string } | { shellId: string };

type TerminalSize = { columns: number; rows: number };

// Operations and the App's replay transport resolve the same Terminal on this Checkout.
export class CheckoutTerminals {
  public constructor(
    private readonly runs: RunTerminals,
    private readonly shells: ShellTerminals,
  ) {}

  public read(
    checkout: RunCheckout,
    target: TerminalTarget,
    scrollback?: number,
  ): Promise<TerminalReadResult> {
    const { terminal, id } = this.resolve(target);

    return terminal.read(checkout, id, scrollback);
  }

  public async send(
    checkout: RunCheckout,
    target: TerminalTarget,
    input: string,
  ): Promise<TerminalSendResult> {
    const { terminal, id } = this.resolve(target);

    return terminal.send(checkout, id, input);
  }

  public async resize(
    checkout: RunCheckout,
    target: TerminalTarget,
    size: TerminalSize,
  ): Promise<void> {
    const { terminal, id } = this.resolve(target);

    await terminal.resize(checkout, id, size);
  }

  public watchOutput(
    checkout: RunCheckout,
    target: TerminalTarget & { cursor?: RunOutputCursor },
    signal: AbortSignal,
  ): AsyncIterable<RunOutput> {
    const { terminal, id } = this.resolve(target);

    return terminal.watchOutput(
      checkout,
      { id, cursor: target.cursor },
      signal,
    );
  }

  private resolve(target: TerminalTarget): {
    terminal: RunTerminals | ShellTerminals;
    id: string;
  } {
    return 'shellId' in target
      ? { terminal: this.shells, id: target.shellId }
      : { terminal: this.runs, id: target.name };
  }
}
