import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { closeEngineDatabase, openEngineDatabase } from './engine-database';

const temporaryHome = (): string => {
  const home = mkdtempSync(join(tmpdir(), 'argo-engine-database-'));
  onTestFinished(() => rmSync(home, { recursive: true, force: true }));

  return home;
};

it('refuses a second Engine on the same home before it touches the database', async (): Promise<void> => {
  const home = temporaryHome();
  const database = await openEngineDatabase({ home });
  onTestFinished(() => closeEngineDatabase(home, database));

  await expect(openEngineDatabase({ home })).rejects.toThrow(
    `Another process is using ${home}`,
  );
  expect(
    database.$client.prepare('SELECT count(*) AS sessions FROM session').get(),
  ).toEqual({ sessions: 0 });
});

it('lets the next Engine open the home once the first closes it', async (): Promise<void> => {
  const home = temporaryHome();
  closeEngineDatabase(home, await openEngineDatabase({ home }));

  const next = await openEngineDatabase({ home });
  onTestFinished(() => closeEngineDatabase(home, next));

  expect(next.$client.isOpen).toBe(true);
});
