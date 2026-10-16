import type { Notice } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session } from '@repo/db/schema';
import { toFeedRowWrite } from '../src/feed';
import { insertEndedTurn, insertSession } from './database';

export const movingSessionId = 'history-00';

export function seedNotificationHistory(database: Database): void {
  database.update(session).set({ activityAt: 1000, createdAt: 1 }).run();
  insertEndedTurn(database);

  insertSession(database, {
    id: movingSessionId,
    activityAt: 1,
    createdAt: 1,
  });
  insertEndedTurn(database, movingSessionId);

  database
    .insert(feedRow)
    .values({ sessionId: movingSessionId, ...toFeedRowWrite(ending) })
    .run();
}

const ending: Notice = {
  sessionId: movingSessionId,
  id: 'historical-turn:end',
  sessionUpdate: 'notice',
  state: 'settled',
  position: 0,
  revision: 1,
  turnId: `${movingSessionId}-first-turn`,
  severity: 'info',
  title: 'Turn ended',
  _meta: {
    argo: { turnEnd: { stopReason: 'end_turn', error: null, durationMs: 1 } },
  },
};
