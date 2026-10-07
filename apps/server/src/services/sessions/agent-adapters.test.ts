import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { agentAdapters } from '@repo/agents';
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
    const registeredCli = mockClis[agent];
    if (!registeredCli) throw new Error(`No mock CLI for ${agent}`);
    const mockCli = registeredCli;

    // Starts a Session whose vendor transcript, if any, belongs to `transcriptId`.
    async function startSession(
      recording: string,
      vendorSessionId: string | null,
      transcriptId: string,
      notificationsFirst = false,
    ) {
      const bin = temporaryDirectory('argo-bin-');
      const cwd = temporaryDirectory('argo-project-');
      await mockCli.write(bin, { recording });
      const environment = {
        PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
        MOCK_CLI_NOTIFICATIONS_FIRST: notificationsFirst ? '1' : '0',
        ...mockCli.writeTranscript(
          temporaryDirectory('argo-vendor-'),
          cwd,
          transcriptId,
        ),
      };
      for (const key of mockCli.apiKeyVariables ?? [])
        vi.stubEnv(key, 'mock-api-key');
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
      notificationsFirst = false,
    ) {
      const started = await startSession(
        recording,
        vendorSessionId,
        vendorSessionId ?? crypto.randomUUID(),
        notificationsFirst,
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

    it.each([false, true])(
      'runs a Turn with edits, a command and an answer, then stops (notifications first: %s)',
      async (notificationsFirst) => {
        const { session, close } = await openSession(
          mockCli.recordings.turn,
          null,
          notificationsFirst,
        );
        const vendorSessionId = session.getSnapshot().context.vendorSessionId;
        prompt(session);
        await waitFor(session, isIdle, { timeout: 10_000 });
        await waitFor(session, (snapshot) => snapshot.context.usage !== null, {
          timeout: 10_000,
        });

        const { output, rows, storedSession } = await close();
        expect(output).toEqual({ failure: null });
        expect(storedSession?.vendorSessionId).toBe(vendorSessionId);
        expect(rows.every((row) => row.state === 'settled')).toBe(true);
        expect(
          rows.filter((row) => row.sessionUpdate === 'user_message'),
        ).toHaveLength(1);
        expect(rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              sessionUpdate: 'tool_call_update',
              kind: 'edit',
              status: 'completed',
            }),
            expect.objectContaining({
              sessionUpdate: 'tool_call_update',
              kind: 'execute',
              status: 'completed',
            }),
          ]),
        );
        expect(rows.at(-1)).toMatchObject({ sessionUpdate: 'agent_message' });
        expect(rows.every((row) => row.turnId === 'turn-1')).toBe(true);
      },
    );

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
        rows.filter((row) => row.sessionUpdate === 'user_message'),
      ).toHaveLength(1);
      expect(
        rows.filter((row) => row.sessionUpdate === 'tool_call_update'),
      ).toEqual([
        expect.objectContaining({ state: 'settled', status: 'cancelled' }),
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

    it.each(mockCli.connectionFailures ?? [])(
      'rejects an unsupported connection with $message',
      async (failure) => {
        for (const [key, value] of Object.entries(failure.environment))
          vi.stubEnv(key, value);
        const { session } = await startSession(
          mockCli.recordings.turn,
          null,
          crypto.randomUUID(),
        );
        const agentActor = session.getSnapshot().children.agent;
        if (!agentActor) throw new Error('No Agent');
        expect(await toPromise(agentActor)).toEqual({
          failure: expect.stringContaining(failure.message),
        });
      },
    );

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
