import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { agentAdapters } from '@repo/agents';
import type { SessionUpdate } from '@repo/contracts';
import { session as sessionTable } from '@repo/db/schema';
import { mockClis } from '@repo/mocks/cli';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type SnapshotFrom, toPromise, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { createSessionHost, firstPrompt } from '#mocks/session';
import { sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.unstubAllEnvs();
});

const temporaryDirectory = (prefix: string) => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), prefix)));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};

const isIdle = (snapshot: SnapshotFrom<SessionActorRef>) =>
  snapshot.can(firstPrompt);

describe.each(agentAdapters)(
  '$agent adapter against its mock CLI',
  (adapter) => {
    const { agent } = adapter;
    const mockCli = mockClis[agent];
    if (!mockCli) throw new Error(`No mock CLI for ${agent}`);

    // Starts a Session whose vendor transcript, if any, belongs to `transcriptId`.
    async function startSession(
      recording: string,
      vendorSessionId: string | null,
      transcriptId: string,
    ) {
      const bin = temporaryDirectory('argo-bin-');
      const cwd = temporaryDirectory('argo-project-');
      await mockCli?.write(bin, { recording });
      const environment = {
        PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
        ...mockCli?.writeTranscript(
          temporaryDirectory('argo-vendor-'),
          cwd,
          transcriptId,
        ),
      };
      for (const [key, value] of Object.entries(environment))
        vi.stubEnv(key, value);
      const { database, remove } = openTestDatabase(
        { agent, checkoutPath: cwd, vendorSessionId },
        cwd,
      );
      cleanups.push(remove);
      const { root, session, service, findFeed } = createSessionHost(
        database,
        adapter,
      );
      cleanups.push(() => root.stop());
      // Closing flushes every row to the database, where the Turn's rows are read back.
      const close = async () => {
        sendSessionCommand(session, { type: 'session.close' });
        await waitFor(session, (snapshot) => snapshot.status === 'done', {
          timeout: 10_000,
        });
        return {
          output: session.getSnapshot().output,
          rows: service.page({
            sessionId: 'session-1',
            direction: 'tail',
            limit: 100,
          }).rows,
          storedSession: database.select().from(sessionTable).get(),
        };
      };
      return { session, findFeed, close };
    }

    async function openSession(
      recording: string,
      vendorSessionId: string | null = null,
    ) {
      const started = await startSession(
        recording,
        vendorSessionId,
        vendorSessionId ?? crypto.randomUUID(),
      );
      await waitFor(started.session, isIdle, { timeout: 10_000 });
      return started;
    }

    const prompt = (session: SessionActorRef) =>
      sendSessionCommand(session, {
        type: 'session.prompt',
        turnId: 'turn-1',
        content: [{ type: 'text', text: 'Edit the files and run a command.' }],
      });

    it('runs a Turn with a thought, edits, a command and an answer, then stops', async () => {
      const { session, close } = await openSession(mockCli.recordings.turn);
      const vendorSessionId = session.getSnapshot().context.vendorSessionId;
      prompt(session);
      await waitFor(session, isIdle, { timeout: 10_000 });
      await waitFor(session, (snapshot) => snapshot.context.usage !== null, {
        timeout: 10_000,
      });

      const { output, rows, storedSession } = await close();
      expect(output).toEqual({ failure: null });
      expect(storedSession?.vendorSessionId).toBe(vendorSessionId);
      expect(
        rows.map((row: SessionUpdate) => [
          row.sessionUpdate,
          row.state,
          row.sessionUpdate === 'tool_call_update'
            ? `${row.kind}:${row.status}`
            : null,
        ]),
      ).toEqual([
        ['user_message', 'settled', null],
        ['agent_thought', 'settled', null],
        ['tool_call_update', 'settled', 'edit:completed'],
        ['tool_call_update', 'settled', 'read:completed'],
        ['tool_call_update', 'settled', 'edit:completed'],
        ['tool_call_update', 'settled', 'execute:completed'],
        ['agent_message', 'settled', null],
      ]);
      expect(rows.every((row) => row.turnId === 'turn-1')).toBe(true);
    });

    it('cancels a Turn during a command', async () => {
      const { session, findFeed, close } = await openSession(
        mockCli.recordings.cancelledTurn,
      );
      const feed = findFeed();
      if (!feed) throw new Error('No Feed');
      prompt(session);
      await waitFor(
        feed,
        (snapshot) =>
          Object.values(snapshot.context.rows).some(
            (row) => row.sessionUpdate === 'tool_call_update',
          ),
        { timeout: 10_000 },
      );
      sendSessionCommand(session, { type: 'session.cancel' });
      await waitFor(session, isIdle, { timeout: 10_000 });

      const { output, rows } = await close();
      expect(output).toEqual({ failure: null });
      expect(
        rows.map((row) =>
          row.sessionUpdate === 'tool_call_update'
            ? [row.sessionUpdate, row.state, row.status]
            : [row.sessionUpdate, row.state],
        ),
      ).toEqual([
        ['user_message', 'settled'],
        ['tool_call_update', 'settled', 'cancelled'],
      ]);
    });

    it('resumes the vendor Session it stored', async () => {
      const vendorSessionId = crypto.randomUUID();
      const { session, close } = await openSession(
        mockCli.recordings.turn,
        vendorSessionId,
      );
      expect(session.getSnapshot().context.vendorSessionId).toBe(
        vendorSessionId,
      );
      prompt(session);
      await waitFor(session, isIdle, { timeout: 10_000 });
      expect((await close()).output).toEqual({ failure: null });
    });

    it('fails with a clear error when the stored vendor Session has no transcript', async () => {
      const { session } = await startSession(
        mockCli.recordings.turn,
        crypto.randomUUID(),
        crypto.randomUUID(),
      );
      const agentActor = session.getSnapshot().children.agent;
      if (!agentActor) throw new Error('No Agent');
      expect(await toPromise(agentActor)).toEqual({
        failure: expect.stringMatching(/no transcript/),
      });
    });
  },
);
