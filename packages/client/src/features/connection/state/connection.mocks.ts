import { behaviorSubject } from '@trpc/server/observable';
import {
  type Connection,
  createConnection,
  type LinkValue,
} from './connection';

// Written out so the tests cannot grade themselves.
export const offlineDelayMs = 10_000;

const lostError = new Error('WebSocket closed');

export interface FakeLink {
  connection: Connection;
  // The WebSocket opens.
  open: () => void;
  // The WebSocket closes with an error.
  lose: () => void;
}

// A Connection watching a link status the test drives, as tRPC's wsClient drives it.
export function fakeLink(): FakeLink {
  const link = behaviorSubject<LinkValue>({
    type: 'state',
    state: 'connecting',
    error: null,
  });

  const connection = createConnection();
  connection.watch(link);

  return {
    connection,
    open: () => link.next({ type: 'state', state: 'pending', error: null }),
    lose: () =>
      link.next({ type: 'state', state: 'connecting', error: lostError }),
  };
}
