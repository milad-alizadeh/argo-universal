import type { TRPCConnectionState } from '@trpc/client/unstable-internals';
import type { Unsubscribable } from '@trpc/server/observable';

export type ConnectionState =
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'offline'
  // The Server answered and no longer knows this Device: it was unpaired there. Nothing reconnects it but pairing again.
  | 'not-allowed';

// Reconnecting turns to offline after this long without the WebSocket.
export const offlineDelayMs = 10_000;

export const retryDelayBaseMs = 500;

export const retryDelayCapMs = 30_000;

// createWSClient's `retryDelayMs` shape; the attempt gate waits it, so foreground and Try again can cut it short.
export const retryDelayMs = (attemptIndex: number): number =>
  Math.min(retryDelayBaseMs * 2 ** attemptIndex, retryDelayCapMs);

export type LinkValue = TRPCConnectionState<unknown>;

// tRPC wsClient's `connectionState`, read only for whether the WebSocket opened or closed.
interface LinkState {
  subscribe: (observer: { next: (value: LinkValue) => void }) => Unsubscribable;
}

export interface Connection {
  state: () => ConnectionState;
  subscribe: (listener: () => void) => () => void;
  // wsClient awaits this before every attempt to open the WebSocket.
  nextAttempt: () => Promise<void>;
  // Watches tRPC's link status; the WebSocket client is built after the gate it awaits.
  watch: (connectionState: LinkState) => void;
  // Coming to the foreground lets a waiting attempt go at once while the Connection is down.
  foreground: () => void;
  // Try again: while offline, shows Reconnecting and lets a waiting attempt go at once.
  retry: () => void;
  // The Server refused this Device's key: it stops trying, since another attempt would be refused the same way.
  refuse: () => void;
  stop: () => void;
}

interface WaitingAttempt {
  timer: ReturnType<typeof setTimeout> | undefined;
  allow: () => void;
  refuse: (cause: Error) => void;
}

interface ConnectionLink {
  state: ConnectionState;
  // Attempts allowed since the Connection last opened.
  attempts: number;
  waiting: WaitingAttempt | undefined;
  offlineTimer: ReturnType<typeof setTimeout> | undefined;
  listeners: Set<() => void>;
  stopWatching: () => void;
}

const isRefused = (state: ConnectionState): boolean => state === 'not-allowed';

// Down to the cache as well as to the owner: a Connection reconnecting has nowhere to send a query.
export const isDown = (state: ConnectionState): boolean =>
  state === 'reconnecting' || state === 'offline' || isRefused(state);

function setState(link: ConnectionLink, state: ConnectionState): void {
  clearTimeout(link.offlineTimer);
  link.offlineTimer =
    state === 'reconnecting'
      ? setTimeout(() => setState(link, 'offline'), offlineDelayMs)
      : undefined;
  link.state = state;

  for (const listener of link.listeners) listener();
}

function opened(link: ConnectionLink): void {
  link.attempts = 0;

  if (link.state !== 'open') setState(link, 'open');
}

// A second loss while reconnecting leaves the offline delay running.
function lost(link: ConnectionLink): void {
  if (!isDown(link.state)) setState(link, 'reconnecting');
}

function allowNow(link: ConnectionLink): void {
  const waiting = link.waiting;

  if (!waiting) return;
  clearTimeout(waiting.timer);
  link.waiting = undefined;
  waiting.allow();
}

// The first attempt goes on the next tick, so a Connection closed straight away, as under StrictMode, never opens a WebSocket.
const attemptDelayMs = (link: ConnectionLink): number =>
  link.state === 'connecting' && link.attempts === 0
    ? 0
    : retryDelayMs(link.attempts);

function nextAttempt(link: ConnectionLink): Promise<void> {
  const delay = attemptDelayMs(link);
  link.attempts += 1;
  // wsClient waits on one attempt at a time; an earlier one still waiting goes now.
  allowNow(link);

  return new Promise((allow, refuse) => {
    // A refused Device waits for good: only closing the Connection ends the wait.
    const timer = isRefused(link.state)
      ? undefined
      : setTimeout(() => allowNow(link), delay);

    link.waiting = { timer, allow, refuse };
  });
}

const isClosed = ({ state, error }: LinkValue): boolean =>
  state === 'connecting' && Boolean(error);

// tRPC's `pending` means the WebSocket opened; `connecting` with an error means it closed.
function onLinkValue(link: ConnectionLink, value: LinkValue): void {
  if (value.state === 'pending') opened(link);
  else if (isClosed(value)) lost(link);
}

function watch(link: ConnectionLink, connectionState: LinkState): void {
  const subscription = connectionState.subscribe({
    next: (value) => onLinkValue(link, value),
  });

  link.stopWatching = (): void => subscription.unsubscribe();
}

function stop(link: ConnectionLink): void {
  link.stopWatching();
  clearTimeout(link.offlineTimer);
  const waiting = link.waiting;
  link.waiting = undefined;

  if (waiting) {
    clearTimeout(waiting.timer);
    waiting.refuse(new Error('The Connection is closed'));
  }

  link.listeners.clear();
}

const newLink = (): ConnectionLink => ({
  state: 'connecting',
  attempts: 0,
  waiting: undefined,
  offlineTimer: undefined,
  listeners: new Set(),
  stopWatching: () => {},
});

function subscribe(link: ConnectionLink, listener: () => void): () => void {
  link.listeners.add(listener);

  return (): void => void link.listeners.delete(listener);
}

function foreground(link: ConnectionLink): void {
  if (isDown(link.state) && !isRefused(link.state)) allowNow(link);
}

function refuse(link: ConnectionLink): void {
  if (!isRefused(link.state)) setState(link, 'not-allowed');
}

function retry(link: ConnectionLink): void {
  if (link.state !== 'offline') return;
  setState(link, 'reconnecting');
  allowNow(link);
}

// The App's Connection to the Server: its shown state over tRPC's link status, and the timing of every attempt to open it.
export function createConnection(): Connection {
  const link = newLink();

  return {
    state: () => link.state,
    subscribe: (listener) => subscribe(link, listener),
    nextAttempt: () => nextAttempt(link),
    watch: (connectionState) => watch(link, connectionState),
    foreground: () => foreground(link),
    retry: () => retry(link),
    refuse: () => refuse(link),
    stop: () => stop(link),
  };
}
