import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationsFolder, openDatabase } from '@repo/db';
import { project } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';

const lastLegacyMigration = '20261120075029_chemical_magdalene';

const legacySession = 'session-1';

interface LegacyScheduleStore {
  home: string;
  nextAt: number;
}

function legacyStore(): LegacyScheduleStore {
  const folder = mkdtempSync(join(tmpdir(), 'argo-follow-up-upgrade-'));
  onTestFinished(() => rmSync(folder, { force: true, recursive: true }));

  const migrations = join(folder, 'migrations');
  mkdirSync(migrations);

  for (const name of readdirSync(migrationsFolder)) {
    if (name <= lastLegacyMigration)
      cpSync(join(migrationsFolder, name), join(migrations, name), {
        recursive: true,
      });
  }

  const home = join(folder, 'server');
  const database = openDatabase(join(home, 'argo.db'), migrations);
  const nextAt = Date.now() + 3_600_000;

  try {
    database
      .insert(project)
      .values({ id: 'project-1', name: 'Project', path: home })
      .run();
    // Raw SQL, as the store is at the legacy schema, not today's.
    database.$client
      .prepare(
        'INSERT INTO session (id, project_id, agent, checkout_path, projection_version) VALUES (?, ?, ?, ?, ?)',
      )
      .run(legacySession, 'project-1', 'mock', home, 1);

    const insert = database.$client.prepare(
      'INSERT INTO session_schedule (id, session_id, prompt, interval_seconds, next_at, paused) VALUES (?, ?, ?, ?, ?, ?)',
    );

    const prompt = JSON.stringify([{ type: 'text', text: 'Check the build' }]);
    insert.run('active', legacySession, prompt, 300, nextAt, 0);
    insert.run('paused', legacySession, prompt, 600, nextAt, 1);
  } finally {
    database.$client.close();
  }

  return { home, nextAt };
}

it('retains the cadence and pause state of existing Session Schedules without assigning expiry', async () => {
  const { home, nextAt } = legacyStore();
  const host = await startAcpEngine({ steps: [], restartOver: home });

  try {
    const followUps = await host.caller.session.listSchedules({
      sessionId: legacySession,
    });

    expect(followUps).toHaveLength(2);
    expect(followUps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'active',
          intervalSeconds: 300,
          endsAt: null,
          state: 'active',
          nextAt,
        }),
        expect.objectContaining({
          id: 'paused',
          intervalSeconds: 600,
          endsAt: null,
          state: 'paused',
          nextAt,
        }),
      ]),
    );
  } finally {
    await host.stop();
  }
}, 30000);
