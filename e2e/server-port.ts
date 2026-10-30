import { readServerAddress } from '@repo/engine/server-runtime';

type ServerAddress = NonNullable<ReturnType<typeof readServerAddress>>;

const serverHost = '127.0.0.1';

export const serverUrlFor = (port: number): string =>
  `ws://${serverHost}:${port}`;

export const serverHttpUrl = (port: number): string =>
  `http://${serverHost}:${port}`;

// The one readiness check for a Server in `home`: server.json, which an Engine or Supervisor writes once it answers.
export const publishedAddress =
  (home: string) => (): ServerAddress | undefined =>
    readServerAddress(home) ?? undefined;
