import { expect, it } from 'vitest';
import { SessionInfoCache, sessionInfoKeptMs } from './session-info-cache';

type Row = { title: string };

type Info = { title: string };

type Build = {
  (row: Row): Promise<Info>;
  count: number;
  // Holds each build until the test lets it answer.
  release: () => void;
};

const firstSession = 'session-1';

const secondSession = 'session-2';

// A build that counts its runs, and answers at once unless held.
function counting(held = false): Build {
  const waiting: (() => void)[] = [];

  const build = async (row: Row): Promise<Info> => {
    build.count += 1;

    if (held) await new Promise<void>((resolve) => waiting.push(resolve));

    return { title: row.title };
  };

  build.count = 0;
  build.release = (): void => {
    for (const resolve of waiting.splice(0)) resolve();
  };

  return build;
}

it('answers a repeat of an unchanged row from what was kept, building once', async () => {
  const sessions = new SessionInfoCache<Row, Info>(() => 0);
  const build = counting();

  await sessions.read(firstSession, { title: 'One' }, build);
  const again = await sessions.read(firstSession, { title: 'One' }, build);

  expect(again).toEqual({ title: 'One' });
  expect(build.count).toBe(1);
});

it('builds again when the row changed, as when the Session is renamed', async () => {
  const sessions = new SessionInfoCache<Row, Info>(() => 0);
  const build = counting();

  await sessions.read(firstSession, { title: 'One' }, build);
  const renamed = await sessions.read(firstSession, { title: 'Two' }, build);

  expect(renamed).toEqual({ title: 'Two' });
  expect(build.count).toBe(2);
});

it('builds again once the kept answer is old, and keeps each Session apart', async () => {
  let now = 0;
  const sessions = new SessionInfoCache<Row, Info>(() => now);
  const build = counting();

  await sessions.read(firstSession, { title: 'One' }, build);
  await sessions.read(secondSession, { title: 'One' }, build);
  expect(build.count).toBe(2);

  now = sessionInfoKeptMs;
  await sessions.read(firstSession, { title: 'One' }, build);
  expect(build.count).toBe(3);
});

it('lets calls that arrive together share one build', async () => {
  const sessions = new SessionInfoCache<Row, Info>(() => 0);
  const build = counting(true);

  const together = Promise.all([
    sessions.read(firstSession, { title: 'One' }, build),
    sessions.read(firstSession, { title: 'One' }, build),
    sessions.read(firstSession, { title: 'One' }, build),
  ]);

  build.release();

  expect(await together).toEqual(Array(3).fill({ title: 'One' }));
  expect(build.count).toBe(1);
});

it('answers null for a Session that has gone, and forgets what it kept', async () => {
  const sessions = new SessionInfoCache<Row, Info>(() => 0);
  const build = counting();

  await sessions.read(firstSession, { title: 'One' }, build);

  expect(await sessions.read(firstSession, undefined, build)).toBeNull();

  await sessions.read(firstSession, { title: 'One' }, build);
  expect(build.count).toBe(2);
});
