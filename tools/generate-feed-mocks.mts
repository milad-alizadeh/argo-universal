import { writeFileSync } from 'node:fs';
import {
  applyFeedChange,
  type Feed,
  userMessageChange,
} from '../apps/server/src/services/feed/feed-change.ts';
import { toLiveHeader } from '../apps/server/src/services/sessions/live-header.ts';
import { titleFromPrompt } from '../apps/server/src/services/sessions/session-data.ts';
import { noChanges } from '../apps/server/src/services/sessions/session-snapshot.ts';
import { mockClis } from '../mocks/cli/index.ts';
import { agentAdapters } from '../packages/agents/src/adapters.ts';
import type { SessionUpdate } from '../packages/contracts/src/feed/session-update.ts';
import {
  type LiveHeader,
  permissionOptions,
  SessionSnapshot,
} from '../packages/contracts/src/sessions/snapshot.ts';
import { worktreeCheckout } from './mock-checkout.mts';

// A fixed Turn start, so the live headers and their elapsed times stay the same on every run.
const turnStartedAt = Date.UTC(2026, 9, 6, 9, 0, 0);

// Mocks use real Agent conversion and Feed validation, including append and patch changes.
type StreamEvent = Extract<
  ReturnType<typeof applyFeedChange>,
  { feed: Feed }
>['streamEvent'];
type GeneratedFeedMock = {
  agent: string;
  recording: string;
  rows: SessionUpdate[];
  stream: (StreamEvent | { type: string; snapshot: SessionSnapshot })[];
  snapshot: SessionSnapshot;
  liveHeaders: LiveHeader[];
};

const mocks = agentAdapters.flatMap(({ agent }, index): GeneratedFeedMock[] => {
  const cli = mockClis[agent];
  if (!cli) throw new Error('Missing Agent mock');
  const recordings = [
    'edit-and-command',
    'interrupt',
    'compaction',
    'image-prompt',
    'markdown-answer',
  ];
  const { commandOutcomes, editStates, editFailure } = cli.recordings;
  if (commandOutcomes !== null) recordings.push(commandOutcomes);
  if (editStates !== null) recordings.push(editStates);
  if (editFailure !== null) recordings.push(editFailure);
  return recordings.map((recording): GeneratedFeedMock => {
    const sessionId = `agent-${index + 1}-${recording}`;
    let feed: Feed = { sessionId, maxRevision: 0, nextPosition: 0, rows: {} };
    let turnNumber = 1;
    let turnId: string | null = 'turn-1';
    const stream: StreamEvent[] = [];
    const liveHeaders: LiveHeader[] = [];
    const header = (
      session: Partial<Parameters<typeof toLiveHeader>[0]> = {},
      extraRows: SessionUpdate[] = [],
    ): ReturnType<typeof toLiveHeader> =>
      toLiveHeader(
        {
          activeTurnId: turnId,
          activeTurnStartedAt: turnId === null ? null : turnStartedAt,
          permissionQueue: [],
          pendingElicitation: null,
          ...session,
        },
        [...Object.values(feed.rows), ...extraRows],
      );
    // The Server's live header after each change, kept when it says something new.
    const recordHeader = (live = header()): void => {
      const last = liveHeaders.at(-1);
      if (
        live &&
        (live.text !== last?.text || live.source.type !== last?.source.type)
      )
        liveHeaders.push(live);
    };
    const apply = (change: Parameters<typeof applyFeedChange>[1]): void => {
      const result = applyFeedChange(feed, change, turnId);
      if ('rejection' in result)
        throw new Error(`${sessionId}: ${result.rejection}`);
      feed = result.feed;
      stream.push(result.streamEvent);
      recordHeader();
    };
    const recordRequestsAndRetry = (): void => {
      const latest = Object.values(feed.rows).at(-1);
      const tool = Object.values(feed.rows).find(
        (
          row,
        ): row is Extract<
          Feed['rows'][string],
          { sessionUpdate: 'tool_call_update' }
        > => row.sessionUpdate === 'tool_call_update',
      );
      if (!latest || !tool || tool.sessionUpdate !== 'tool_call_update') return;
      recordHeader(
        header({
          permissionQueue: [
            {
              toolCallId: tool.toolCallId,
              title: tool.title,
              options: permissionOptions,
            },
          ],
        }),
      );
      recordHeader(
        header({
          pendingElicitation: {
            requestId: 'request-1',
            mode: 'form',
            message: tool.title,
            requestedSchema: { properties: {} },
          },
        }),
      );
      recordHeader(
        header({
          pendingPlanProposal: { planId: 'plan-1', content: tool.title },
        }),
      );
      recordHeader(
        header({}, [
          {
            id: `${sessionId}:retry`,
            sessionId,
            turnId: turnId ?? 'turn-1',
            position: latest.position + 1,
            revision: latest.revision + 1,
            sessionUpdate: 'notice',
            state: 'settled',
            severity: 'warning',
            title: 'Retrying',
            _meta: {
              argo: { retry: { attempt: 2, maxAttempts: 5, delayMs: 1000 } },
            },
          },
        ]),
      );
    };
    // The Session writes the prompt a person sent before the Agent answers, as it does in `startTurn`.
    const prompt = cli.recordedPrompt(recording);
    if (prompt) apply(userMessageChange('turn-1', prompt));
    for (const event of cli.feedEvents(recording)) {
      if (event.type === 'agent.turnStarted') {
        turnId = `turn-${turnNumber}`;
        continue;
      }
      if (event.type === 'agent.turnEnded') {
        // The requests and a retry the Server would show over this Turn's rows, before it ends.
        turnId ??= `turn-${turnNumber}`;
        recordRequestsAndRetry();
        turnNumber += 1;
        turnId = null;
        continue;
      }
      if (event.type !== 'agent.feed') continue;
      // Some adapters report Turn starts at the connection boundary, outside the converter.
      turnId ??= `turn-${turnNumber}`;
      apply(event.change);
    }
    const snapshot = SessionSnapshot.parse({
      agent: `agent-${index + 1}`,
      // What the Server stores for a new worktree Session: the prompt's first line titles it.
      title: (prompt && titleFromPrompt(prompt)) || recording,
      titleSource: 'prompt',
      checkout: worktreeCheckout(sessionId),
      state: turnId === null ? 'idle' : 'running',
      liveHeader: header(),
      activeTurnId: turnId,
      usage: null,
      pendingPermission: null,
      pendingElicitation: null,
      pendingPlanProposal: null,
      configOptions: [],
      changes: noChanges,
      epoch: 0,
      maxRevision: feed.maxRevision,
    });
    return {
      agent: `agent-${index + 1}`,
      recording,
      rows: Object.values(feed.rows).sort(
        (first, second): number => first.position - second.position,
      ),
      stream: [...stream, { type: 'snapshot', snapshot }],
      snapshot,
      liveHeaders,
    };
  });
});
writeFileSync(
  new URL('../packages/api/mocks/feed-recordings.json', import.meta.url),
  `${JSON.stringify(mocks, null, 2)}\n`,
);
