import { connect, createServer } from 'node:net';
import { TRPCError } from '@trpc/server';
import type { RunConfiguration } from './run-configurations';

const firstPort = 4100;

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

type Allocation = {
  configuration: RunConfiguration;
  // The port the Run Configuration's last Run had, kept if it is free again.
  previous: number | undefined;
  // Ports live Runs hold.
  held: ReadonlySet<number>;
  free: (port: number) => Promise<boolean>;
};

const unavailable = async (
  port: number,
  { held, free }: Allocation,
): Promise<boolean> => held.has(port) || !(await free(port));

// A Run Configuration's own port is kept, and refused if taken; otherwise the last Run's port if free, else the lowest free port from 4100.
export async function allocatePort(allocation: Allocation): Promise<number> {
  const { configuration, previous } = allocation;
  const { port } = configuration;

  if (port !== undefined) {
    if (await unavailable(port, allocation))
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Port ${port} of Run Configuration "${configuration.name}" is already in use`,
      });

    return port;
  }

  if (previous !== undefined && !(await unavailable(previous, allocation)))
    return previous;

  for (let candidate = firstPort; ; candidate += 1)
    if (!(await unavailable(candidate, allocation))) return candidate;
}

export const urlOf = (configuration: RunConfiguration, port: number): string =>
  configuration.url
    ? configuration.url.replaceAll(/\$\{?PORT\}?/gu, String(port))
    : `http://localhost:${port}`;
