import type { AgentOutput } from '@repo/agents';
import type { UserMessage } from '@repo/contracts';
import type { SessionUpdate } from '@repo/contracts';
import type { FeedActorRef } from '../feed/feed-machine';

type ClosedSession = {
  output: AgentOutput | undefined;
  rows: SessionUpdate[];
  storedSession: typeof sessionTable.$inferSelect | undefined;
};
type StartedSession = {
  session: SessionActorRef;
  findFeed: () => FeedActorRef | undefined;
  close: () => Promise<ClosedSession>;
};
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { agentAdapters } from '@repo/agents';
import { session as sessionTable } from '@repo/db/schema';
import { mockClis } from '@repo/mocks/cli';
import {
  type MockCliScenarioInput,
  mockCliScenarioEnvironment,
} from '@repo/mocks/cli/mock-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type SnapshotFrom, toPromise, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { createSessionHost, firstPrompt } from '#mocks/session';
import { sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';

const cleanups: (() => void)[] = [];
afterEach((): void => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

const temporaryDirectory = (prefix: string): string => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), prefix)));
  cleanups.push((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  return directory;
};

const isIdle = (snapshot: SnapshotFrom<SessionActorRef>): boolean =>
  snapshot.can(firstPrompt);

describe.each(agentAdapters)(
  '$agent adapter against its mock CLI',
  (adapter): void => {
    const { agent } = adapter;
    const registeredCli = mockClis[agent];
    if (!registeredCli) throw new Error(`No mock CLI for ${agent}`);
    const mockCli = registeredCli;

    // Starts a Session whose vendor transcript, if any, belongs to `transcriptId`.
    async function startSession(
      recording: string,
      vendorSessionId: string | null,
      transcriptId: string,
      scenario: MockCliScenarioInput = {},
    ): Promise<StartedSession> {
      const bin = temporaryDirectory('argo-bin-');
      const cwd = temporaryDirectory('argo-project-');
      await mockCli.write(bin, { recording });
      const transcript = mockCli.writeTranscript(
        temporaryDirectory('argo-vendor-'),
        cwd,
        transcriptId,
      );
      const environment = {
        PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
        ...transcript.environment,
        ...mockCliScenarioEnvironment({ ...scenario, ...transcript.scenario }),
      };
      for (const key of mockCli.apiKeyVariables)
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
      cleanups.push((): ReturnType<typeof root.stop> => root.stop());
      // Closing flushes every row to the database, where the Turn's rows are read back.
      const close = async (): Promise<ClosedSession> => {
        sendSessionCommand(session, { type: 'session.close' });
        await waitFor(
          session,
          (
            snapshot,
          ): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
            snapshot.status === 'done',
          {
            timeout: 10_000,
          },
        );
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
      scenario: MockCliScenarioInput = {},
    ): Promise<StartedSession> {
      const started = await startSession(
        recording,
        vendorSessionId,
        vendorSessionId ?? crypto.randomUUID(),
        scenario,
      );
      await waitFor(started.session, isIdle, { timeout: 10_000 });
      return started;
    }

    const prompt = (session: SessionActorRef): void =>
      sendSessionCommand(session, {
        type: 'session.prompt',
        turnId: 'turn-1',
        content: [{ type: 'text', text: 'Edit the files and run a command.' }],
      });

    const reorderings = [
      { notificationsFirst: false, title: 'notifications first: false' },
      {
        notificationsFirst: true,
        title:
          'notifications first: true; skipped where the protocol has no prompt response to reorder',
      },
    ];
    for (const { notificationsFirst, title } of reorderings)
      it.skipIf(
        notificationsFirst &&
          mockCli.unsupportedScenarios.includes('notificationsFirst'),
      )(
        `runs a Turn with edits, a command and an answer, then stops (${title})`,
        async (): Promise<void> => {
          const { session, close } = await openSession(
            mockCli.recordings.turn,
            null,
            { notificationsFirst },
          );
          const vendorSessionId = session.getSnapshot().context.vendorSessionId;
          prompt(session);
          await waitFor(session, isIdle, { timeout: 10_000 });
          await waitFor(
            session,
            (snapshot): boolean => snapshot.context.usage !== null,
            { timeout: 10_000 },
          );

          const { output, rows, storedSession } = await close();
          expect(output).toEqual({ failure: null });
          expect(storedSession?.vendorSessionId).toBe(vendorSessionId);
          expect(rows.every((row): boolean => row.state === 'settled')).toBe(
            true,
          );
          expect(
            rows.filter(
              (row): row is UserMessage => row.sessionUpdate === 'user_message',
            ),
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
          expect(rows.every((row): boolean => row.turnId === 'turn-1')).toBe(
            true,
          );
        },
      );

    it('cancels a Turn during a command', async (): Promise<void> => {
      const { session, findFeed, close } = await openSession(
        mockCli.recordings.cancelledTurn,
      );
      const feed = findFeed();
      if (!feed) throw new Error('No Feed');
      prompt(session);
      await waitFor(
        feed,
        (snapshot): boolean =>
          Object.values(snapshot.context.rows).some(
            (
              row,
            ): row is Extract<
              SessionUpdate,
              { sessionUpdate: 'tool_call_update' }
            > => row.sessionUpdate === 'tool_call_update',
          ),
        { timeout: 10_000 },
      );
      sendSessionCommand(session, { type: 'session.cancel' });
      await waitFor(session, isIdle, { timeout: 10_000 });

      const { output, rows } = await close();
      expect(output).toEqual({ failure: null });
      expect(
        rows.filter(
          (row): row is UserMessage => row.sessionUpdate === 'user_message',
        ),
      ).toHaveLength(1);
      expect(
        rows.filter(
          (
            row,
          ): row is Extract<
            SessionUpdate,
            { sessionUpdate: 'tool_call_update' }
          > => row.sessionUpdate === 'tool_call_update',
        ),
      ).toEqual([
        expect.objectContaining({ state: 'settled', status: 'cancelled' }),
      ]);
    });

    it('resumes the vendor Session it stored', async (): Promise<void> => {
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

    it.each(mockCli.connectionFailures)(
      'rejects an unsupported connection with $message',
      async (failure): Promise<void> => {
        const { session } = await startSession(
          mockCli.recordings.turn,
          null,
          crypto.randomUUID(),
          failure.scenario,
        );
        const agentActor = session.getSnapshot().children.agent;
        if (!agentActor) throw new Error('No Agent');
        expect(await toPromise(agentActor)).toEqual({
          failure: expect.stringContaining(failure.message),
        });
      },
    );

    it('fails with a clear error when the stored vendor Session has no transcript', async (): Promise<void> => {
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
