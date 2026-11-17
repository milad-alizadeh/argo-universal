import { expect, it } from 'vitest';
import { end } from './auto-archive-fixture';
import { watch } from './auto-fix-fixture';
import { attached, automationOf, reference, slow } from './auto-merge-fixture';
import { archivedSessions } from './journey-archive-fixture';
import { project, sessionId, type Journey } from './journey-fixture';

const tap = (
  run: Journey,
  kind: string,
  on: boolean,
): ReturnType<Journey['test']['pages']['run']> =>
  run.test.pages.run({
    operation: 'automationSet',
    sessionId,
    args: { reference, projectId: project.id, sessionId, kind, on },
  });

for (const kind of ['fix', 'merge', 'archive'] as const)
  for (const on of [true, false])
    it(
      `lets an App viewing a Session turn auto-${kind} ${on ? 'on' : 'off'}`,
      async () => {
        const run = await attached();

        if (!on) await tap(run, kind, true);

        await tap(run, kind, on);

        expect((await automationOf(run))[kind].on).toBe(on);
      },
      slow,
    );

it(
  'archives a merged Session after Auto-archive was enabled from the App',
  async () => {
    const run = await attached();

    await tap(run, 'archive', true);
    end(run, 12, 'merged');

    await watch(run);

    expect(archivedSessions(run)).toEqual([sessionId]);
  },
  slow,
);
