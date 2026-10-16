import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { agents } from '@repo/db/schema';
import { expect, it, onTestFinished, vi } from 'vitest';
import { readConfiguredAgents } from './configuration-sql';

const registryConfiguration = {
  source: 'registry',
  release: null,
  overrides: { args: [], env: [] },
};

it.each([
  { label: 'malformed JSON', configuration: '{broken' },
  { label: 'JSON of the wrong shape', configuration: '{"source":"elsewhere"}' },
])(
  'skips only the Agent whose stored configuration is $label',
  ({ configuration }) => {
    const directory = mkdtempSync(join(tmpdir(), 'argo-configuration-'));
    onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const database = openDatabase(join(directory, 'argo.db'));
    onTestFinished(() => database.$client.close());
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    database
      .insert(agents)
      .values([
        { id: 'damaged', configuration },
        {
          id: 'readable',
          configuration: JSON.stringify(registryConfiguration),
        },
      ])
      .run();
    expect(
      readConfiguredAgents(database).filter(({ id }) =>
        ['damaged', 'readable'].includes(id),
      ),
    ).toEqual([
      { id: 'readable', enabled: true, configuration: registryConfiguration },
    ]);
    expect(log).toHaveBeenCalledOnce();
  },
);
