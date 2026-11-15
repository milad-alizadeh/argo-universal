import { expect, it } from 'vitest';
import {
  archiveOffer,
  end,
  outcomes,
  tapArchive,
} from './auto-archive-fixture';
import { watch } from './auto-fix-fixture';
import { attached, reference, slow } from './auto-merge-fixture';
import { archivedSessions, setTurn } from './journey-archive-fixture';
import { attach, detach } from './journey-calls-fixture';
import { restart, sessionId } from './journey-fixture';
import { attached as attachedAll } from './journey-watch-fixture';

it(
  'is off by default and archives nothing for a merged pull request',
  async () => {
    const run = await attached();

    end(run, 12, 'merged');
    await watch(run);

    expect(archivedSessions(run)).toEqual([]);
    expect(await archiveOffer(run)).toEqual({ on: false, available: true });
  },
  slow,
);

for (const how of outcomes)
  it(
    `archives the Session once its pull request is ${how}, with no App connected`,
    async () => {
      const run = await attached();

      await tapArchive(run, true);
      expect(await archiveOffer(run)).toEqual({ on: true, available: true });

      await watch(run);
      expect(archivedSessions(run)).toEqual([]);

      end(run, 12, how);
      await watch(run);
      await watch(run);

      expect(archivedSessions(run)).toEqual([sessionId]);
    },
    slow,
  );

it(
  'keeps its choice across a restart and forgets it when the pull request is detached',
  async () => {
    const run = await attached();

    await tapArchive(run, true);
    await restart(run);
    expect((await archiveOffer(run)).on).toBe(true);

    await detach(run, reference);
    await attach(run, reference);
    expect(await archiveOffer(run)).toEqual({ on: false, available: true });

    end(run, 12, 'merged');
    await watch(run);
    expect(archivedSessions(run)).toEqual([]);
  },
  slow,
);

it(
  'waits while another Change of the Session is Open, then archives on a later Watch',
  async () => {
    const run = await attachedAll(12, 13);

    await tapArchive(run, true);
    end(run, 12, 'merged');
    await watch(run);
    expect(archivedSessions(run)).toEqual([]);

    end(run, 13, 'closed');
    await watch(run);
    expect(archivedSessions(run)).toEqual([sessionId]);
  },
  slow,
);

it(
  'waits while a Turn runs, then archives on a later Watch',
  async () => {
    const run = await attached();

    await tapArchive(run, true);
    end(run, 12, 'merged');
    setTurn(run, sessionId, true);
    await watch(run);
    expect(archivedSessions(run)).toEqual([]);
    expect((await archiveOffer(run)).on).toBe(true);

    setTurn(run, sessionId, false);
    await watch(run);
    expect(archivedSessions(run)).toEqual([sessionId]);
  },
  slow,
);

it(
  'archives once, and turns itself off for the Session it archived',
  async () => {
    const run = await attached();

    await tapArchive(run, true);
    end(run, 12, 'merged');
    await watch(run);
    await watch(run);

    expect(archivedSessions(run)).toEqual([sessionId]);
    expect((await archiveOffer(run)).on).toBe(false);
  },
  slow,
);

it(
  'never archives on a failed read',
  async () => {
    const run = await attached();

    await tapArchive(run, true);
    end(run, 12, 'merged');
    await archiveOffer(run);
    run.github.failWith.status = 500;
    await watch(run);

    expect(archivedSessions(run)).toEqual([]);
    expect((await archiveOffer(run)).on).toBe(true);

    run.github.failWith.status = null;
    await watch(run);
    expect(archivedSessions(run)).toEqual([sessionId]);
  },
  slow,
);
