import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { fixtureNetwork, httpsServer } from '#mocks/probe-plugin';
import { writePlugin } from '#mocks/runtime-plugins';

async function installDiscovery(home: string, port: number): Promise<void> {
  const host = `localhost:${port}`;
  await writePlugin(home, {
    id: 'github',
    fixture: 'healthy',
    dev: true,
    capabilities: [{ kind: 'fetch', host, reason: 'Local fixture' }],
    operations: [
      {
        name: 'discover',
        label: 'Discover',
        description: 'Find pull requests',
        tier: 'act',
        params: {
          unlessAttached: {
            type: 'boolean',
            description: 'Skip attached Sessions',
          },
        },
      },
    ],
  });
  await writeFile(
    join(home, 'shipped/github/index.mjs'),
    `
    export function register(argo) {
      argo.operations.register('discover', async () => {
        const response = await argo.fetch('https://${host}/pulls');
        return { status: response.status };
      });
    }
  `,
  );
}

it('serves Sessions across Agents while Turn-end discovery waits and fails', async () => {
  const release = Promise.withResolvers<void>();
  let requests = 0;
  let failures = 0;
  const port = await httpsServer((_req, res) => {
    requests++;
    res.once('finish', () => failures++);
    void release.promise.then(() => res.writeHead(503).end());
  });
  const host = await startAcpEngine({
    steps: [],
    otherAgents: ['second'],
    pluginNetwork: await fixtureNetwork(),
    installPlugins: (home) => installDiscovery(home, port),
  });
  const sessions = await Promise.all(
    ['mock', 'second'].map((agent) =>
      host.caller.session.new({ ...emptySessionInput, agent }),
    ),
  );
  const send = async (text: string): Promise<void> => {
    await Promise.all(
      sessions.map((session) =>
        host.caller.session.prompt({
          ...session,
          prompt: [{ type: 'text', text }],
        }),
      ),
    );
  };
  const idle = () =>
    Promise.all(
      sessions.map(({ sessionId }) => waitForAcpSessionIdle(host, sessionId)),
    );
  try {
    await send('First');
    await idle();
    await expect
      .poll(() => requests, { timeout: 5000 })
      .toBeGreaterThanOrEqual(2);
    await send('While pending');
    await idle();
    for (const session of sessions) {
      const page = await host.caller.feed.page({
        ...session,
        direction: 'tail',
      });
      expect(
        page.rows.filter((row) => row.sessionUpdate === 'user_message'),
      ).toHaveLength(2);
    }
  } finally {
    release.resolve();
  }
  await expect
    .poll(() => failures, { timeout: 5000 })
    .toBeGreaterThanOrEqual(2);
  await send('After failure');
  await idle();
  await Promise.all(
    sessions.map((session) => host.caller.session.close(session)),
  );
}, 20_000);
