import type * as React from 'react';
import { createContext, type ReactNode, useContext } from 'react';

/*
 * The id of the Server on this Device, which an App reaches without Pairing: the Server Device's App never pairs with
 * itself (ADR-0045). Every other Server is keyed by its static public key, the anchor that a rename or a new address
 * cannot move.
 */
export const ownServerId = 'server-device';

// No copy says "Mac": a Server Device may be Windows or Linux (ADR-0045). The Server's own name replaces this once it answers.
export const ownServerName = 'This computer';

/*
 * The Server the App is looking at, and this Device's relationship to it. Server Device and Paired Device describe a
 * relationship to one Server rather than a kind of computer, so the same Device reads as the Server Device while the
 * App shows its own Server and as a Paired Device while it shows another computer's (GLOSSARY, ADR-0022). Everything
 * that differs between the two — the Device heading in Settings, the Server-Device-only pages — keys off this.
 */
export interface ServerScope {
  id: string;
  name: string;
  serverDevice: boolean;
}

const ownScope: ServerScope = {
  id: ownServerId,
  name: ownServerName,
  serverDevice: true,
};

const ServerScopeContext = createContext<ServerScope>(ownScope);

export function ServerScopeProvider({
  server,
  children,
}: {
  server: ServerScope;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ServerScopeContext.Provider value={server}>
      {children}
    </ServerScopeContext.Provider>
  );
}

export const useServerScope = (): ServerScope => useContext(ServerScopeContext);

// True while the App is looking at a Server on another computer, which this Device paired with.
export const useServerPaired = (): boolean => !useServerScope().serverDevice;
