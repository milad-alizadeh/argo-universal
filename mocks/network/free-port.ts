import { createServer } from 'node:net';

const loopbackHost = '127.0.0.1';

export function findFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject): void => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, loopbackHost, (): void => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : undefined;
      server.close((error): void => {
        if (port === undefined) reject(new Error('No free port'));
        else if (error) reject(error);
        else resolve(port);
      });
    });
  });
}
