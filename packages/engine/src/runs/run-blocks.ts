import type { LiveRun } from './live-run';
import type { RunConfiguration } from './run-configurations';
import {
  allocateBlock,
  allocatePort,
  blockPorts,
  blockSize,
} from './run-ports';
import type { RunStarter } from './runs';

type Checkout = { projectId: string; checkoutPath: string };

const checkoutKeyOf = ({ projectId, checkoutPath }: Checkout): string =>
  JSON.stringify([projectId, checkoutPath]);

export const starterName = (starter?: RunStarter): string => {
  if (!starter) return 'another Session';

  return starter.title ? `Session "${starter.title}"` : `Session ${starter.id}`;
};

// Runs the tasks one after the other, whether or not an earlier one failed.
export const serially = (): (<Result>(
  task: () => Promise<Result>,
) => Promise<Result>) => {
  let tail: Promise<unknown> = Promise.resolve();

  return (task) => {
    const result = tail.then(task);
    tail = result.catch((): void => undefined);

    return result;
  };
};

export type RunPorts = {
  // The Run's own port, `$PORT`.
  port: number;
  // The first port of the Checkout's block.
  block: number;
  // `$PORT` and `$ARGO_PORT_0..n`.
  env: Record<string, string>;
};

/*
 * The ports of the Checkouts' Runs: each Checkout holds one block while any of its Runs live, and a Run Configuration's own port
 * is held by one Checkout at a time. A block is the Checkout's alone, so a Run of another Checkout never lands inside it.
 */
export class RunBlocks {
  // The block each Checkout last had, so it gets the same ports back once its Runs end and start again.
  private readonly last = new Map<string, number>();
  public constructor(
    private readonly live: () => Iterable<LiveRun>,
    private readonly free: (port: number) => Promise<boolean>,
  ) {}

  // Call one at a time: two Runs of one Checkout must not each reserve a block.
  public async reserve(
    checkout: Checkout,
    configuration: RunConfiguration,
    previous: { port: number } | undefined,
  ): Promise<RunPorts> {
    const key = checkoutKeyOf(checkout);

    const own = [...this.live()].filter(
      (run) => checkoutKeyOf(run.record) === key,
    );

    const block = own[0]?.block ?? (await this.newBlock(key));
    const ports = blockPorts(block);

    const port = await allocatePort({
      configuration,
      previous: previous?.port,
      block: ports,
      taken: new Set(own.map((run) => run.record.port)),
      holder: (candidate) => this.holder(candidate, key, false),
      free: this.free,
    });

    return {
      port,
      block,
      env: {
        ...Object.fromEntries(
          ports.map((value, index) => [`ARGO_PORT_${index}`, String(value)]),
        ),
        PORT: String(port),
      },
    };
  }

  private async newBlock(key: string): Promise<number> {
    const block = await allocateBlock({
      preferred: this.last.get(key),
      holder: (port) => this.holder(port, key, true),
      free: this.free,
    });

    this.last.set(key, block);

    return block;
  }

  // Who holds a port: a live Run using it, or the Run of another Checkout whose block has it (any block when `reserved`).
  private holder(
    port: number,
    key: string,
    reserved: boolean,
  ): string | undefined {
    for (const run of this.live()) {
      const own = checkoutKeyOf(run.record) === key;

      if (run.record.port === port)
        return own
          ? `Run Configuration "${run.record.name}" of this Checkout`
          : run.starter;

      if (
        (reserved || !own) &&
        run.block <= port &&
        port < run.block + blockSize
      )
        return run.starter;
    }

    return undefined;
  }
}
