import { randomUUID } from 'node:crypto';
import { turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { writerTurnCases } from '#mocks/session-list-writer-cases';
import { createAcpResources } from '../../../agents';
import { writerMachine } from '../../../storage';
import { openSessionsMachine } from '../../open-sessions-machine';
import {
  TurnInsertJob,
  TurnUpdateJob,
} from '../../session-storage/session-storage';
import { onWriterChange, type WriterChange } from '../observation';
import type { SessionListState } from '../state';
import { createSessionListReader } from './reader';

const writeEvent = 'writer.write';

const queuedTurnId = 'queued-turn';

it.each(writerTurnCases)(
  'publishes the effective %s Turn and parent from Writer changes before its insert commits',
  async ({ sessionId, expected }): Promise<void> => {
    const { database, directory, remove } = openTestDatabase();
    onTestFinished(remove);
    insertEndedTurn(database);
    insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
    database.$client.exec(
      "CREATE TRIGGER reject_turn BEFORE INSERT ON turn BEGIN SELECT RAISE(ABORT, 'locked'); END",
    );

    const writer = createActor(writerMachine, {
      input: { database, now: () => 1000, log: () => {} },
    }).start();

    onTestFinished(() => {
      writer.stop();
    });

    const sessions = createActor(openSessionsMachine, {
      input: {
        now: () => 1000,
        createId: randomUUID,
        hooks: coreOnlyHooks,
        database,
        runtimeDirectory: directory,
        acpResources: createAcpResources(),
        installedAgents: unlaunchedInstalledAgents(database, directory),
        writer,
      },
    });

    const reader = createSessionListReader({
      database,
      sessions,
      writer: () => writer,
    });

    reader.readRows();

    const observed: { ids: string[]; running: boolean; subagents: number }[] =
      [];

    const listener = onWriterChange(writer, (change: WriterChange) => {
      const ids = reader.relatedSessionIds(reader.sessionIdsForChanges(change));

      const parent = reader
        .readRows(ids)
        .find((row) => row.information.sessionId === 'session-1');

      observed.push(parentObservation(ids, parent));
    });

    onTestFinished(() => listener.unsubscribe());
    writer.send({
      type: writeEvent,
      job: new TurnInsertJob({
        turn: { id: queuedTurnId, sessionId, status: 'running', startedAt: 1 },
      }),
    });
    await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
    writer.send({
      type: writeEvent,
      job: new TurnUpdateJob({
        id: queuedTurnId,
        set: { status: 'ended', endedAt: 2, stopReason: 'end_turn' },
      }),
    });
    expect(observed).toEqual(expected);

    const queuedTurn = database
      .select()
      .from(turn)
      .where(eq(turn.id, queuedTurnId));

    expect(queuedTurn.all()).toEqual([]);
    database.$client.exec('DROP TRIGGER reject_turn');
    writer.send({ type: 'writer.drain' });
    await waitFor(writer, (snapshot) => snapshot.status === 'done');
    expect(queuedTurn.all()).toMatchObject([
      { id: queuedTurnId, status: 'ended' },
    ]);
    expect(observed).toHaveLength(3);
    expect(observed[2]).toEqual(observed[1]);
  },
);

type ParentObservation = { ids: string[]; running: boolean; subagents: number };

function parentObservation(
  ids: string[],
  parent: SessionListState[number] | undefined,
): ParentObservation {
  if (!parent) return { ids, running: false, subagents: 0 };

  return {
    ids,
    running: parent.running,
    subagents: parent.information.subagents.running,
  };
}
