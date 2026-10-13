import { agentAdapters } from '@repo/agents';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it, vi } from 'vitest';
import {
  dropFeedWriteTrigger,
  queuedToolActivity,
  waitForCancelStep,
} from '#mocks/feed-inputs';
import { takeFeedChanges } from '#mocks/feed-observations';
import {
  database,
  feedTestHost,
  controller,
  scriptedAgent,
  startFeedTestHost,
  createFeedRouterCaller,
} from '#mocks/feed-suite';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'keeps %s queued Tool-call headers visible before persistence',
  async (agent): Promise<void> => {
    await startFeedTestHost({ steps: [{ type: waitForCancelStep }] }, agent);
    await createFeedRouterCaller().session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Read queued file' }],
    });
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    await requireScriptedProcessAt(scriptedAgent.processes).play(
      feedScenario([
        {
          sessionUpdate: 'tool_call',
          toolCallId: 'queued-tool',
          title: 'Read queued file',
          kind: 'read',
          status: 'in_progress',
          content: [],
        },
      ]).steps,
      'vendor-1',
    );
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      (await createFeedRouterCaller().session.list({ archived: false }))
        .sessions,
    ).toMatchObject([{ sessionId: 'session-1', activity: queuedToolActivity }]);
    const updates = (
      await feedTestHost
        .createCaller({ signal: controller.signal })
        .feed.subscribe({
          sessionId: 'session-1',
          after: { epoch: 3, revision: 6 },
        })
    )[Symbol.asyncIterator]();
    await takeFeedChanges(updates, 1);
    expect((await updates.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: { state: 'running', liveHeader: { text: queuedToolActivity } },
    });
    database.$client.exec(dropFeedWriteTrigger);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      (await createFeedRouterCaller().session.list({ archived: false }))
        .sessions,
    ).toMatchObject([{ sessionId: 'session-1', activity: queuedToolActivity }]);
  },
);
