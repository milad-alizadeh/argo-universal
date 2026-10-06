import { writeFileSync } from 'node:fs';
import {
  applyFeedChange,
  type Feed,
  userMessageChange,
} from '../apps/server/src/services/feed/feed-change.ts';
import { mockClis } from '../mocks/cli/index.ts';
import { agentAdapters } from '../packages/agents/src/adapters.ts';
import { SessionSnapshot } from '../packages/contracts/src/sessions/snapshot.ts';

// Mocks use real Agent conversion and Feed validation, including append and patch changes.
const mocks = agentAdapters.flatMap(({ agent }, index) => {
  const cli = mockClis[agent];
  if (!cli) throw new Error('Missing Agent mock');
  const recordings = [
    'edit-and-command',
    'interrupt',
    'compaction',
    'image-prompt',
    'markdown-answer',
  ];
  if (cli.recordings.commandOutcomes)
    recordings.push(cli.recordings.commandOutcomes);
  return recordings.map((recording) => {
    const sessionId = `agent-${index + 1}-${recording}`;
    let feed: Feed = { sessionId, maxRevision: 0, nextPosition: 0, rows: {} };
    let turnNumber = 1;
    let turnId: string | null = 'turn-1';
    const stream = [];
    const apply = (change: Parameters<typeof applyFeedChange>[1]) => {
      const result = applyFeedChange(feed, change, turnId);
      if ('rejection' in result)
        throw new Error(`${sessionId}: ${result.rejection}`);
      feed = result.feed;
      stream.push(result.streamEvent);
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
  });
});
writeFileSync(
  new URL('../packages/api/mocks/feed-recordings.json', import.meta.url),
  `${JSON.stringify(mocks, null, 2)}\n`,
);
