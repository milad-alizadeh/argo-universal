import { writeFileSync } from 'node:fs';
import {
  applyFeedChange,
  type Feed,
} from '../apps/server/src/services/feed/feed-change.ts';
import { mockClis } from '../mocks/cli/index.ts';
import { agentAdapters } from '../packages/agents/src/adapters.ts';
import { SessionSnapshot } from '../packages/contracts/src/sessions/snapshot.ts';

// Mocks use real Agent conversion and Feed validation, including append and patch changes.
const mocks = agentAdapters.flatMap(({ agent }, index) => {
  const cli = mockClis[agent];
  if (!cli) throw new Error('Missing Agent mock');
  return ['edit-and-command', 'interrupt', 'compaction', 'image-prompt'].map(
    (recording) => {
      const sessionId = `agent-${index + 1}-${recording}`;
      let feed: Feed = { sessionId, maxRevision: 0, nextPosition: 0, rows: {} };
      let turnNumber = 1;
      let turnId: string | null = 'turn-1';
      const stream = [];
      for (const event of cli.feedEvents(recording)) {
        if (event.type === 'agent.turnStarted') {
          turnId = `turn-${turnNumber}`;
          continue;
        }
        if (event.type === 'agent.turnEnded') {
          turnNumber += 1;
          turnId = null;
          continue;
        }
        if (event.type !== 'agent.feed') continue;
        // Some adapters report Turn starts at the connection boundary, outside the converter.
        turnId ??= `turn-${turnNumber}`;
        const result = applyFeedChange(feed, event.change, turnId);
        if ('rejection' in result)
          throw new Error(`${sessionId}: ${result.rejection}`);
        feed = result.feed;
        stream.push(result.streamEvent);
      }
      const snapshot = SessionSnapshot.parse({
        state: turnId === null ? 'idle' : 'running',
        liveHeader: null,
        activeTurnId: turnId,
        usage: null,
        pendingPermission: null,
        pendingElicitation: null,
        configOptions: [],
        epoch: 0,
        maxRevision: feed.maxRevision,
      });
      return {
        agent: `agent-${index + 1}`,
        recording,
        rows: Object.values(feed.rows).sort(
          (first, second) => first.position - second.position,
        ),
        stream: [...stream, { type: 'snapshot', snapshot }],
        snapshot,
      };
    },
  );
});
writeFileSync(
  new URL('../packages/api/mocks/feed-recordings.json', import.meta.url),
  `${JSON.stringify(mocks, null, 2)}\n`,
);
