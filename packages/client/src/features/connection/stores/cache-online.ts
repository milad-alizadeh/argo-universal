import { onlineManager } from '@tanstack/react-query';
import { type Connection, isDown } from './connection';

/*
 * The cache's online flag, driven by one Connection. react-query keeps `onlineManager` as a single flag for the whole
 * process and gives a QueryClient no way to hold one of its own, so the Server being looked at is the only Connection
 * allowed to drive it: an App holds a Connection to each of several Servers (ADR-0022), and a paired Server that is
 * switched off must not pause the queries of the Server the owner is reading. Dropping the hold leaves the cache
 * online, so the next Server's queries run whatever state the Connection before it was left in.
 */
export function holdCacheOnline(connection: Connection): () => void {
  const apply = (): void =>
    onlineManager.setOnline(!isDown(connection.state()));

  apply();
  const stop = connection.subscribe(apply);

  return (): void => {
    stop();
    onlineManager.setOnline(true);
  };
}
