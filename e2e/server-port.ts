import { createServer } from 'node:net';

const serverHost = '127.0.0.1';
export const serverUrlFor = (port: number): string =>
  `ws://${serverHost}:${port}`;
export const serverHttpUrl = (port: number): string =>
  `http://${serverHost}:${port}`;

export const findFreePort = (): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, serverHost, (): void => {
      const address = server.address();
      server.close((): void =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('No free port')),
      );
    });
  });
