import { ownServerId } from '#lib/product/server-scope';
import { type AppServer, ownAppServer, pairedAppServer } from './app-server';
import {
  keepLookedAtServer,
  loadKnownServers,
  loadLookedAtServer,
} from './known-servers';

export interface ServersSnapshot {
  // The own Server first, then each Server this Device has paired with, in the order Pairing kept them.
  servers: readonly AppServer[];
  // The id of the Server the App is showing: whose Sessions, Projects and Feed it reads.
  lookingAt: string;
}

export interface ServersStore {
  subscribe: (changed: () => void) => () => void;
  getSnapshot: () => ServersSnapshot;
  // Shows another Server's Sessions. An id the App cannot show is ignored.
  look: (id: string) => void;
}

/*
 * The App's list of Servers: the Server on this Device, then the Servers it paired with, which it reads from this
 * Device's storage. One entry is the ordinary case and no entry is missing, so the list never draws as empty.
 */
class AppServersStore implements ServersStore {
  private readonly own: AppServer;
  private readonly listeners = new Set<() => void>();
  private snapshot: ServersSnapshot;
  private loading: Promise<void> | undefined;

  public constructor(ownServerUrl: string) {
    this.own = ownAppServer(ownServerUrl);
    this.snapshot = { servers: [this.own], lookingAt: ownServerId };
  }

  public readonly getSnapshot = (): ServersSnapshot => this.snapshot;

  public readonly subscribe = (changed: () => void): (() => void) => {
    this.listeners.add(changed);
    // The kept Servers load once, on the first reader; the own Server is listed before they arrive.
    this.loading ??= this.load();

    return () => void this.listeners.delete(changed);
  };

  public readonly look = (id: string): void => {
    if (id === this.snapshot.lookingAt) return;

    if (!canShow(this.snapshot.servers, id)) return;

    this.set({ ...this.snapshot, lookingAt: id });
    keepLookedAtServer(id);
  };

  private set(next: ServersSnapshot): void {
    this.snapshot = next;

    for (const listener of this.listeners) listener();
  }

  private async load(): Promise<void> {
    const [known, lookedAt] = await Promise.all([
      loadKnownServers(),
      loadLookedAtServer(),
    ]);

    const servers = [this.own, ...known.map(pairedAppServer)];

    this.set({ servers, lookingAt: shownOrOwn(servers, lookedAt) });
  }
}

export const createServersStore = (ownServerUrl: string): ServersStore =>
  new AppServersStore(ownServerUrl);

/*
 * A Server the App can show: one it holds with somewhere to open a Connection. A paired Server whose address this
 * Device has not learned has none, so it stays in the list, reading as unreachable, rather than showing a blank App.
 */
const canShow = (servers: readonly AppServer[], id: string): boolean =>
  servers.some((server) => server.id === id && server.url !== undefined);

/*
 * A kept Server the App cannot show — one this Device has since unpaired, or one whose address it has not learned —
 * leaves the App on its own Server rather than on a page with nothing in it.
 */
const shownOrOwn = (
  servers: readonly AppServer[],
  lookedAt: string | null,
): string =>
  lookedAt !== null && canShow(servers, lookedAt) ? lookedAt : ownServerId;
