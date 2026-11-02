/*
 * Who a Connection proved to be: the Server Device, or one paired Device by its own row. It comes from the credential the Connection authenticated with, never from the address it came from (ADR-0045).
 * A Connection with no identity has proved nothing, and every procedure refuses it.
 */
export type RpcIdentity =
  | { readonly serverDevice: true }
  | { readonly serverDevice: false; readonly deviceId: string };

export const serverDeviceIdentity: RpcIdentity = { serverDevice: true };

// The part of a Connection's socket the Server reads: when it closes, and the identity whatever admitted it recorded against it.
export interface RpcSocket {
  once(event: 'close', listener: () => void): void;
}

const identities = new WeakMap<RpcSocket, RpcIdentity>();

// What admitted a socket says who is on the other end of it; the context reads it back when a call arrives.
export const admitAs = (socket: RpcSocket, identity: RpcIdentity): void => {
  identities.set(socket, identity);
};

export const identityOf = (socket: RpcSocket): RpcIdentity | undefined =>
  identities.get(socket);
