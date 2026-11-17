import { expect, it, onTestFinished, vi, type Mock } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { SqlJob } from '#mocks/storage-job';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { writerMachine } from '../storage/writer-machine';
import { watchProjectChanges } from './changes';
import { readPluginProjectIds, readPluginProjects } from './index';

type Started = ReturnType<typeof openTestDatabase> & {
  writer: ReturnType<typeof createActor<typeof writerMachine>>;
  origins: Map<string, string>;
  readOrigin: Mock<(path: string) => Promise<string | null>>;
};

// A Server whose Writer commits the Project rows, and an origin reader that counts its reads.
function started(): Started {
  const storage = openTestDatabase();

  const writer = createActor(writerMachine, {
    input: { database: storage.database, now: () => 1000, log: () => {} },
  }).start();

  const stopWatching = watchProjectChanges(storage.database, () => {}, writer);

  onTestFinished(() => {
    stopWatching();
    writer.stop();
    storage.remove();
  });

  const origins = new Map<string, string>();

  const readOrigin = vi.fn<(path: string) => Promise<string | null>>(
    async (path) => origins.get(path) ?? null,
  );

  return { ...storage, writer, origins, readOrigin };
}

const firstOrigin = async ({
  database,
  readOrigin,
}: Started): Promise<string | null | undefined> =>
  (await readPluginProjects(database, readOrigin))[0]?.originUrl;

const addProject = (id: string): SqlJob =>
  new SqlJob({
    statement: `INSERT INTO project (id, path, name) VALUES ('${id}', '/work/${id}', '${id}')`,
  });

it('reads Project ids without reading any origin', () => {
  const { database, readOrigin } = started();

  expect(readPluginProjectIds(database)).toEqual(['project-1']);
  expect(readOrigin).not.toHaveBeenCalled();
});

it('reads one origin per Project for ten concurrent reads', async () => {
  const { database, writer, readOrigin } = started();

  await writeDatabaseJobAndWaitForCommit(writer, addProject('project-2'));
  await writeDatabaseJobAndWaitForCommit(writer, addProject('project-3'));

  await Promise.all(
    Array.from({ length: 10 }, () => readPluginProjects(database, readOrigin)),
  );
  await readPluginProjects(database, readOrigin);

  expect(readPluginProjectIds(database)).toHaveLength(3);
  expect(readOrigin).toHaveBeenCalledTimes(3);
});

it('lists an added and a removed Project once the Writer commits it, with no hand-made announcement', async () => {
  const { database, writer, readOrigin } = started();

  expect(await readPluginProjects(database, readOrigin)).toHaveLength(1);

  await writeDatabaseJobAndWaitForCommit(writer, addProject('project-2'));

  expect(
    (await readPluginProjects(database, readOrigin)).map(({ id }) => id),
  ).toEqual(['project-1', 'project-2']);

  await writeDatabaseJobAndWaitForCommit(
    writer,
    new SqlJob({ statement: "DELETE FROM project WHERE id = 'project-2'" }),
  );

  expect(
    (await readPluginProjects(database, readOrigin)).map(({ id }) => id),
  ).toEqual(['project-1']);
});

// A remote changed outside Argo is read again once a Project change is announced, not before: nothing else signals it.
it('shows a remote changed outside Argo once a Project change is announced', async () => {
  const host = started();
  const { origins } = host;
  const first = 'git@github.com:owner/one.git';
  const second = 'git@github.com:owner/two.git';

  origins.set('/project', first);
  expect(await firstOrigin(host)).toBe(first);

  origins.set('/project', second);
  expect(await firstOrigin(host)).toBe(first);

  await writeDatabaseJobAndWaitForCommit(host.writer, addProject('project-2'));

  expect(await firstOrigin(host)).toBe(second);
});
