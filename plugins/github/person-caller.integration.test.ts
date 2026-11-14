import { expect, it } from 'vitest';
import { fileOf, setFiles } from './journey-files';
import {
  foreignSessionId,
  journey,
  project,
  secondSessionId,
  sessionId,
  type Journey,
} from './journey-fixture';

const slow = 30_000;

const outsideMessage = 'does not belong to this Project';

const reference = 'owner/repository#12';

// The App's own run: a person in the Project, with no Session of their own.
const asPerson = (
  { test }: Journey,
  name: string,
  params: Record<string, string | number>,
): ReturnType<Journey['test']['operations']['run']> =>
  test.operations.run({
    name,
    params,
    caller: { projectId: project.id, person: true },
  });

it(
  'lets a person attach, list, read the files and diff, refresh, discover and detach with an explicit sessionId',
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [fileOf('a.ts')]);

    expect(
      await asPerson(run, 'attach', { reference, sessionId }),
    ).toMatchObject({
      attached: true,
    });
    expect(await asPerson(run, 'list', { sessionId })).toMatchObject({
      changes: [{ id: 'github:owner/repository#12' }],
    });
    expect(
      await asPerson(run, 'files', { reference, sessionId }),
    ).toMatchObject({ files: [{ path: 'a.ts' }] });
    expect(
      await asPerson(run, 'diff', { reference, path: 'a.ts', sessionId }),
    ).toMatchObject({ file: { path: 'a.ts' } });
    expect(await asPerson(run, 'refresh', { sessionId })).toMatchObject({
      changes: [{ id: 'github:owner/repository#12' }],
    });
    expect(await asPerson(run, 'discover', { sessionId })).toMatchObject({
      result: 'found',
    });
    expect(
      await asPerson(run, 'detach', { reference, sessionId }),
    ).toMatchObject({ detached: true });
    expect(await asPerson(run, 'list', { sessionId })).toEqual({ changes: [] });
  },
  slow,
);

it(
  'refuses a person a Session outside the Project, and a person who names none',
  async () => {
    const run = await journey();
    const outside = { reference, sessionId: foreignSessionId };

    for (const name of ['attach', 'detach', 'files'])
      await expect(asPerson(run, name, outside)).rejects.toThrow(
        outsideMessage,
      );

    for (const name of ['list', 'refresh', 'discover'])
      await expect(
        asPerson(run, name, { sessionId: foreignSessionId }),
      ).rejects.toThrow(outsideMessage);

    await expect(
      asPerson(run, 'diff', { ...outside, path: 'a.ts' }),
    ).rejects.toThrow(outsideMessage);
  },
  slow,
);

const everyOperation = [
  'attach',
  'detach',
  'list',
  'refresh',
  'discover',
  'files',
  'diff',
];

type Params = { reference?: string; path?: string };

const paramsFor = (name: string): Params => {
  if (name === 'diff') return { reference, path: 'a.ts' };

  return ['list', 'refresh', 'discover'].includes(name) ? {} : { reference };
};

it(
  'refuses a person who names no Session, for every Operation',
  async () => {
    const run = await journey();

    for (const name of everyOperation)
      await expect(asPerson(run, name, paramsFor(name))).rejects.toThrow(
        'sessionId',
      );
  },
  slow,
);

it(
  'refuses an Agent that names another Session of the same Project, for every Operation',
  async () => {
    const run = await journey();

    for (const name of everyOperation)
      await expect(
        run.test.operations.run({
          name,
          params: { ...paramsFor(name), sessionId: secondSessionId },
          caller: { projectId: project.id, sessionId },
        }),
      ).rejects.toThrow('only act for itself');
  },
  slow,
);
