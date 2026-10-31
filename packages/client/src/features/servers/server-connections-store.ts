import type { AppServer } from './app-server';
import {
  connectableServers,
  type HeldServer,
  type OpenServerConnection,
} from './open-server-connections';

// One Connection and the address it was opened to, so a Server that moves is reopened and one that has not is left alone.
interface HeldConnection<Held extends HeldServer> {
  url: string;
  open: Held;
}

type ServerUrls = ReadonlyMap<string, string>;

/*
 * The App's Connection to each Server it holds one for (ADR-0022). The Connections outlive the list: holding a list
 * again opens a Connection for a Server that has none, closes the Connection of a Server that has gone or moved, and
 * leaves every other Connection exactly as it was. Reading this Device's kept Servers at startup therefore costs the
 * own Server's Connection nothing, where closing and opening them all would drop its WebSocket and blank the App.
 */
export class ServerConnectionsStore<Held extends HeldServer> {
  private readonly held = new Map<string, HeldConnection<Held>>();
  private readonly listeners = new Set<() => void>();
  private readonly open: OpenServerConnection<Held>;
  private snapshot: ReadonlyMap<string, Held> = new Map();

  public constructor(open: OpenServerConnection<Held>) {
    this.open = open;
  }

  public readonly getSnapshot = (): ReadonlyMap<string, Held> => this.snapshot;

  public readonly subscribe = (changed: () => void): (() => void) => {
    this.listeners.add(changed);

    return () => void this.listeners.delete(changed);
  };

  // One Connection per Server with an address, whatever else the list has done since it was last held.
  public readonly hold = (servers: readonly AppServer[]): void => {
    const urls = connectableServers(servers);
    const closed = this.closeGone(urls);
    const opened = this.openMissing(urls);

    if (closed || opened) this.publish();
  };

  public readonly closeAll = (): void => {
    const held = [...this.held.keys()];

    for (const id of held) this.closeHeld(id);

    this.publish();
  };

  private closeGone(urls: ServerUrls): boolean {
    const gone = [...this.held].filter(
      ([id, held]) => urls.get(id) !== held.url,
    );

    for (const [id] of gone) this.closeHeld(id);

    return gone.length > 0;
  }

  private openMissing(urls: ServerUrls): boolean {
    const missing = [...urls].filter(([id]) => !this.held.has(id));

    for (const [id, url] of missing)
      this.held.set(id, { url, open: this.open(url) });

    return missing.length > 0;
  }

  private closeHeld(id: string): void {
    const held = this.held.get(id);
    this.held.delete(id);
    void held?.open.close();
  }

  private publish(): void {
    this.snapshot = new Map(
      [...this.held].map(([id, held]) => [id, held.open]),
    );

    for (const listener of this.listeners) listener();
  }
}
