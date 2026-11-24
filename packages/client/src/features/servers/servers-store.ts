import type { KnownServer } from '#features/connection';
import { type AppServer, ownAppServer, pairedAppServer } from './app-server';
import {
  forgetKnownServer,
  keepKnownServer,
  keepLookedAtServer,
  loadKnownServers,
  loadLookedAtServer,
} from './known-servers';
import { forgetServerHistory, notePaired } from './server-history';

export interface ServersSnapshot {
  // The own Server first, where this Device runs one, then each Server it has paired with, in the order Pairing kept them.
  servers: readonly AppServer[];
  // The id of the Server the App is showing: whose Sessions, Projects and Feed it reads. A phone that holds none shows none.
  lookingAt: string;
  // False until this Device's kept Servers have been read, so the App never opens on its own Server and then moves.
  read: boolean;
}

export interface ServersStore {
  subscribe: (changed: () => void) => () => void;
  getSnapshot: () => ServersSnapshot;
  // Shows another Server's Sessions. An id the App cannot show is ignored.
  look: (id: string) => void;
  // Lists a Server this Device has just paired with, keeps it, and shows it; its Connection opens at once.
  add: (server: KnownServer) => void;
  // Forgets a Server this Device has unpaired from; the App looks at its own Server if it was showing that one. The own Server cannot be removed.
  remove: (id: string) => void;
}

/*
 * The App's list of Servers: the Server on this Device, then the Servers it paired with, which it reads from this
 * Device's storage. Only the desktop app and the web App run beside a Server of their own; a phone or tablet lists
 * just the Servers it paired with, and holds none until it pairs.
 */
class AppServersStore implements ServersStore {
  private readonly own: readonly AppServer[];
  private readonly listeners = new Set<() => void>();
  private snapshot: ServersSnapshot;
  private loading: Promise<void> | undefined;

  public constructor(
    ownServerUrl: string | undefined,
    private readonly onForgotten: readonly ((serverId: string) => void)[],
  ) {
    this.own = ownServerUrl === undefined ? [] : [ownAppServer(ownServerUrl)];
    this.snapshot = {
      servers: this.own,
      lookingAt: fallbackOf(this.own),
      read: false,
    };
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

    if (!showsServer(this.snapshot.servers, id)) return;

    this.set({ ...this.snapshot, lookingAt: id });
    keepLookedAtServer(id);
  };

  public readonly add = (known: KnownServer): void => {
    const added = pairedAppServer(known);
    const others = this.snapshot.servers.filter(({ id }) => id !== added.id);

    this.set({
      servers: [...others, added],
      lookingAt: added.id,
      read: true,
    });
    keepLookedAtServer(added.id);
    void keepKnownServer(known);
    void notePaired(known.key, Date.now());
  };

  public readonly remove = (id: string): void => {
    const servers = this.snapshot.servers.filter(
      (server) => server.id !== id || server.serverDevice,
    );

    if (servers.length === this.snapshot.servers.length) return;

    this.set({
      servers,
      lookingAt: shownOrOwn(servers, this.snapshot.lookingAt),
      read: true,
    });
    void forgetKnownServer(id);
    void forgetServerHistory(id);

    for (const forget of this.onForgotten) forget(id);
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

    const servers = [...this.own, ...known.map(pairedAppServer)];

    this.set({
      servers,
      lookingAt: shownOrOwn(servers, lookedAt),
      read: true,
    });
  }
}

export const createServersStore = (
  ownServerUrl?: string,
  // What the App has kept on the Device for a Server is wiped through these when the Server is unpaired or removed.
  {
    onForgotten = [],
  }: { onForgotten?: readonly ((serverId: string) => void)[] } = {},
): ServersStore => new AppServersStore(ownServerUrl, onForgotten);

/*
 * A Server the App can show: one it holds with somewhere to open a Connection. A paired Server whose address this
 * Device has not learned has none, so it stays in the list, reading as unreachable, rather than showing a blank App.
 */
const showable = (server: AppServer): boolean =>
  server.url !== undefined || server.channel !== undefined;

export const showsServer = (
  servers: readonly AppServer[],
  id: string,
): boolean => servers.some((server) => server.id === id && showable(server));

const fallbackOf = (servers: readonly AppServer[]): string =>
  servers.find(showable)?.id ?? '';

/*
 * A kept Server the App cannot show — one this Device has since unpaired, or one whose address it has not learned —
 * leaves the App on its own Server, or on another it paired with, rather than on a page with nothing in it.
 */
const shownOrOwn = (
  servers: readonly AppServer[],
  lookedAt: string | null,
): string =>
  lookedAt !== null && showsServer(servers, lookedAt)
    ? lookedAt
    : fallbackOf(servers);
