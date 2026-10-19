import { once } from 'node:events';
import { createServer } from 'node:http';
import { expect, it } from 'vitest';
import { downloadAgentArchive } from './download';

it.each([
  { known: true, finalProgress: 1 },
  { known: false, finalProgress: undefined },
])(
  'downloads an archive with a known total: $known',
  async ({ known, finalProgress }) => {
    const server = createServer((_request, response) => {
      if (known) response.setHeader('content-length', '6');
      response.write('arc');
      response.end('hiv');
    });

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    try {
      const address = server.address();

      if (!address || typeof address === 'string')
        throw new Error('Missing test port');
      const progress: number[] = [];

      const bytes = await downloadAgentArchive(
        `http://127.0.0.1:${address.port}`,
        new AbortController().signal,
        (value) => progress.push(value),
      );

      expect(new TextDecoder().decode(bytes)).toBe('archiv');

      expect(progress.at(-1)).toBe(finalProgress);
      expect(progress.length === 0).toBe(!known);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);
