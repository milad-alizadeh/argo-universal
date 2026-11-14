import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { AgentServerEnvironment } from '@repo/contracts';
import { migrationsFolder, openDatabase } from '@repo/db';
import { agentServers } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { seededEnvironment, vendorRegistryIds } from './vendor';

const backfill = '20261114123303_backfill_install_seeds';

// Saves `rows` on a database migrated up to the backfill, then runs the backfill and returns every saved environment.
const backfilled = (
  rows: Readonly<Record<string, AgentServerEnvironment>>,
): Record<string, AgentServerEnvironment> => {
  const directory = mkdtempSync(join(tmpdir(), 'install-seed-backfill-'));
  const before = join(directory, 'before');

  cpSync(migrationsFolder, before, {
    recursive: true,
    filter: (source) => basename(source) !== backfill,
  });

  const file = join(directory, 'argo.db');
  const earlier = openDatabase(file, before);

  for (const [id, env] of Object.entries(rows))
    earlier
      .insert(agentServers)
      .values({ id, env: JSON.stringify(env) })
      .run();

  earlier.$client.close();

  const database = openDatabase(file);

  return Object.fromEntries(
    database
      .select()
      .from(agentServers)
      .all()
      .map(({ id, env }) => [id, JSON.parse(env)]),
  );
};

it('gives Agents installed before their install seed that seed', () => {
  expect(
    backfilled({
      [vendorRegistryIds.claude]: {},
      [vendorRegistryIds.codex]: {},
      'example-agent': {},
    }),
  ).toEqual({
    [vendorRegistryIds.claude]: seededEnvironment(vendorRegistryIds.claude),
    [vendorRegistryIds.codex]: seededEnvironment(vendorRegistryIds.codex),
    'example-agent': {},
  });
});

it('keeps the keys the person set, and adds the seed beside them', () => {
  expect(
    backfilled({
      [vendorRegistryIds.claude]: { CLAUDE_CODE_ENABLE_TODO_TOOLS: '0' },
      [vendorRegistryIds.codex]: { OPENAI_BASE_URL: 'http://localhost' },
    }),
  ).toEqual({
    [vendorRegistryIds.claude]: { CLAUDE_CODE_ENABLE_TODO_TOOLS: '0' },
    [vendorRegistryIds.codex]: {
      OPENAI_BASE_URL: 'http://localhost',
      ...seededEnvironment(vendorRegistryIds.codex),
    },
  });
});
