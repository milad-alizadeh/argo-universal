import { connect, createServer } from 'node:net';
import { TRPCError } from '@trpc/server';
import type { RunConfiguration } from './run-configurations';

const firstPort = 4100;

const lastPort = 65_535;

export const portListening = (port: number): Promise<boolean> =>
  new Promise((done) => {
    const socket = connect({ port, host: '127.0.0.1' });

    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => {
      socket.destroy();
      done(false);
    });
  });

// Whether the Server can bind the port, so nothing else holds it.
export const bindable = (port: number): Promise<boolean> =>
  new Promise((done) => {
    const server = createServer();

    server.once('error', () => done(false));
    server.listen(port, '127.0.0.1', () => server.close(() => done(true)));
  });

// How many ports each Checkout reserves: `$ARGO_PORT_0` to `$ARGO_PORT_9`.
export const blockSize = 10;

export const blockPorts = (base: number): number[] =>
  Array.from({ length: blockSize }, (_, index) => base + index);

type Holders = {
  // Who holds a port a live Run uses or a live Checkout reserved, told by name; nothing when it is not held.
  holder: (port: number) => string | undefined;
  free: (port: number) => Promise<boolean>;
};

const inUse = (port: number, { holder, free }: Holders): Promise<boolean> =>
  holder(port) === undefined
    ? free(port).then((open) => !open)
    : Promise.resolve(true);

// The Checkout's block: the one it had last time if it is still free, else the lowest block from 4100 of which no port is held or taken.
export async function allocateBlock(
  holders: Holders & { preferred: number | undefined },
): Promise<number> {
  const open = async (base: number): Promise<boolean> => {
    for (const port of blockPorts(base))
      if (await inUse(port, holders)) return false;

    return true;
  };

  const { preferred } = holders;

  if (preferred !== undefined && (await open(preferred))) return preferred;

  for (
    let base = firstPort;
    base + blockSize - 1 <= lastPort;
    base += blockSize
  )
    if (await open(base)) return base;

  throw new TRPCError({
    code: 'CONFLICT',
    message: `No block of ${blockSize} TCP ports is available for this Checkout`,
  });
}

type Allocation = Holders & {
  configuration: RunConfiguration;
  // The port the Run Configuration's last Run had, kept if it is free again.
  previous: number | undefined;
  // The Checkout's block, and the ports of it its other live Runs use.
  block: readonly number[];
  taken: ReadonlySet<number>;
};

// A Run Configuration's own port is used as given, and refused if held, naming who holds it; otherwise the last Run's port of the block if free, else the lowest free port of the block.
export async function allocatePort(allocation: Allocation): Promise<number> {
  const { configuration, previous, block, taken, holder } = allocation;
  const { port } = configuration;

  if (port !== undefined) {
    const by = holder(port);
    const holding = by ? ` by ${by}` : '';

    if (by !== undefined || !(await allocation.free(port)))
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Port ${port} of Run Configuration "${configuration.name}" is already in use${holding}`,
      });

    return port;
  }

  const candidates =
    previous !== undefined && block.includes(previous)
      ? [previous, ...block]
      : block;

  for (const candidate of candidates)
    if (!taken.has(candidate) && (await allocation.free(candidate)))
      return candidate;

  throw new TRPCError({
    code: 'CONFLICT',
    message: `Every port of this Checkout's block ${block[0]}-${block.at(-1)} is in use, so "${configuration.name}" has none`,
  });
}

export const urlOf = (configuration: RunConfiguration, port: number): string =>
  configuration.url
    ? configuration.url.replaceAll(/\$\{?PORT\}?/gu, String(port))
    : `http://localhost:${port}`;
