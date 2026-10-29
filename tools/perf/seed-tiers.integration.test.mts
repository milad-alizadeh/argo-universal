import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentMessage, type SessionUpdate } from '@repo/contracts';
import { beforeAll, expect, it } from 'vitest';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { expectHistoryIdentities } from './seed-identities.test.mocks.mts';
import { history, listed } from './seed-public.test.mocks.mts';
import { startSeededServer } from './seed.mts';

beforeAll(bundleEngine);

function expectRecordedMixture(rows: SessionUpdate[]): void {
  expect(new Set(rows.map((row) => row.sessionUpdate))).toEqual(
    new Set([
      'user_message',
      'agent_thought',
      'tool_call_update',
      'agent_message',
      'compaction_update',
    ]),
  );
  expect(
    new Set(
      rows.flatMap((row) =>
        row.sessionUpdate === 'tool_call_update' ? [row.kind] : [],
      ),
    ),
  ).toEqual(new Set(['read', 'edit', 'execute']));
  expect(JSON.stringify(rows)).not.toContain('"blobId"');
  const latest = AgentMessage.parse(rows.at(-1));

  expect(
    latest.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join(''),
  ).toContain('The single patch attempt failed:');
}

it.each([
  { sessions: 100, feedRows: 100 },
  { sessions: 100, feedRows: 1000 },
  { sessions: 100, feedRows: 10_000 },
  { sessions: 1000, feedRows: 100 },
  { sessions: 1000, feedRows: 1000 },
  { sessions: 1000, feedRows: 10_000 },
])(
  'provides $feedRows recorded Feed rows and $sessions visible Sessions',
  async (tier) => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'argo-tier-regression-'),
    );

    const server = await startSeededServer(directory, tier);

    try {
      const sessions = await listed(server.serverUrl);
      expect(sessions).toHaveLength(tier.sessions);

      const long = sessions.find(
        ({ title }) => title === server.longSessionTitle,
      );

      if (!long)
        throw new Error('The seeded long Session must be publicly listed');
      const rows = await history(server.serverUrl, long.sessionId);

      expect(rows).toHaveLength(tier.feedRows);
      expect(server.requested).toEqual(tier);
      expect(
        Object.values(server.rowKinds).reduce(
          (total, count) => total + count,
          0,
        ),
      ).toBe(tier.feedRows);
      expect(new Set(Object.keys(server.rowKinds))).toEqual(
        new Set([
          'user_message',
          'agent_thought',
          'tool_call_update',
          'agent_message',
          'compaction_update',
        ]),
      );
      expectHistoryIdentities(rows, long.sessionId);
      expectRecordedMixture(rows);
    } finally {
      await server.stop();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
