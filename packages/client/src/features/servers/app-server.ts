import type { ConnectionState, KnownServer } from '#features/connection';
import {
  ownServerId,
  ownServerName,
  type ServerScope,
} from '#lib/product/server-scope';

/*
 * One Server this App holds a Connection to; an App holds one to each of several (ADR-0022). `serverDevice` is this
 * Device's relationship to this Server and not a kind of computer, so the same Device reads true on its own Server's
 * entry and false on the entry for another computer's.
 */
export interface AppServer extends ServerScope {
  // Where the Connection opens; absent for a paired Server whose address this Device has not learned yet.
  url?: string;
}

// What the list says of one Server. There is no offline copy: unreachable is a drawn state (ADR-0045).
export type AppServerState = 'connected' | 'connecting' | 'unreachable';

export const ownAppServer = (url: string): AppServer => ({
  id: ownServerId,
  name: ownServerName,
  serverDevice: true,
  url,
});

// An IPv6 address needs brackets in a URL; a name or an IPv4 address is written as it is kept.
const hostInUrl = (host: string): string =>
  host.includes(':') ? `[${host}]` : host;

// A Server this Device paired with. Its address is a fallback only, and the discovery name is what is re-resolved.
export const pairedAppServer = (known: KnownServer): AppServer => ({
  id: known.key,
  name: known.name,
  serverDevice: false,
  url:
    known.address &&
    `ws://${hostInUrl(known.address.host)}:${known.address.port}`,
});

// A Connection still trying reads as connecting; one that has given up is what the owner reads as unreachable.
const states: Record<ConnectionState, AppServerState> = {
  open: 'connected',
  connecting: 'connecting',
  reconnecting: 'connecting',
  offline: 'unreachable',
};

/*
 * One Server's own state, from its own Connection. A Server with no Connection at all — no address learned yet — is
 * unreachable, which is what the owner needs to read, and the same word the Connection reaches after it gives up.
 */
export const serverStateOf = (
  connection: ConnectionState | undefined,
): AppServerState =>
  connection === undefined ? 'unreachable' : states[connection];
