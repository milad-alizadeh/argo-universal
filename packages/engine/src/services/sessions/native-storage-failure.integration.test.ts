import type { AgentCommand } from '@repo/agents';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { sendSessionCommand } from './session-command';
import { findSessionActor } from './session-system';

// More settled message rows than the Writer keeps queued for the Feed.
const messageCount = 300;
const holdMessageRows =
  "CREATE TRIGGER hold_message_rows BEFORE INSERT ON feed_row WHEN NEW.session_update = 'agent_message' BEGIN SELECT RAISE(FAIL, 'storage failure'); END";

it('a native Turn that outgrows the Writer while storage fails is cancelled once and ends with a storage error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const commands: AgentCommand[] = [];
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (value): undefined => {
      stream = value;
      value.receive((command): number => commands.push(command));
    },
  });
  const host = await startEngineTestHost({ database, adapters: [adapter] });
  host.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent: adapter.agent,
  });
  const session = findSessionActor(host.engine.system, 'session-1');
  await vi.waitFor(() => expect(stream).toBeDefined());
  if (!session || !stream) throw new Error('Session did not open');
  sendSessionCommand(session, {
    type: 'session.prompt',
    turnId: 'turn-1',
    content: [],
  });
  host.database.$client.exec(holdMessageRows);
  for (let index = 0; index < messageCount; index += 1)
    stream.send({
      type: 'agent.feed',
      change: {
        type: 'upsert',
        update: {
          id: `reply-${index}`,
          messageId: `reply-${index}`,
          sessionUpdate: 'agent_message',
          state: 'settled',
          content: [{ type: 'text', text: `Reply ${index}` }],
        },
      },
    });
  await vi.waitFor(() =>
    expect(commands).toContainEqual({ type: 'agent.cancel' }),
  );
  stream.send({ type: 'agent.turnEnded', stopReason: 'cancelled' });
  host.database.$client.exec('DROP TRIGGER hold_message_rows');

  await expect
    .poll(
      () =>
        host.database.$client
          .prepare(
            "SELECT stop_reason AS stopReason, error FROM turn WHERE id = 'turn-1' AND status = 'ended'",
          )
          .get(),
      { timeout: 10_000 },
    )
    .toEqual({
      stopReason: 'error',
      error: expect.stringContaining('Storage is failing'),
    });
  expect(
    commands.filter((command): boolean => command.type === 'agent.cancel'),
  ).toHaveLength(1);
});
