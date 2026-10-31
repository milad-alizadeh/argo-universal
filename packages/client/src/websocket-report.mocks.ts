import type { QueryClient } from '@tanstack/react-query';

export interface ConnectionReport {
  serverUrl: string;
  open: number;
  closed: number;
  screenSubscriptions: number;
  statesScreensSaw: string[];
  // How many caches the screens have been given: one per Server the App has looked at.
  cachesScreensSaw: number;
}

const sockets: WebSocketMock[] = [];

const statesScreensSaw = new Set<string>();

const cachesScreensSaw = new Set<QueryClient>();

let screenSubscriptions = 0;

const listeners = new Set<() => void>();

let report = buildReport();

export const currentReport = (): ConnectionReport => report;

export function recordScreenSubscription(): void {
  screenSubscriptions += 1;
  changed();
}

export function recordScreenState(state: string): void {
  statesScreensSaw.add(state);
  changed();
}

// The cache a screen reads through, so a Server switch is seen to give the screens a cache of its own.
export function recordScreenCache(cache: QueryClient): void {
  cachesScreensSaw.add(cache);
  changed();
}

function buildReport(): ConnectionReport {
  const serverUrl = sockets.at(-1)?.url;
  const closed = sockets.filter((socket) => socket.isClosed()).length;

  return {
    // tRPC's Connection parameters add transport query fields to the socket URL.
    serverUrl: serverUrl ? new URL(serverUrl).origin : '',
    open: sockets.length - closed,
    closed,
    screenSubscriptions,
    statesScreensSaw: [...statesScreensSaw],
    cachesScreensSaw: cachesScreensSaw.size,
  };
}

function changed(): void {
  report = buildReport();

  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  return (): boolean => listeners.delete(listener);
}

// Stands in for the Server's end of each WebSocket: it opens at once, answers PING, and never answers a request.
class WebSocketMock extends EventTarget implements WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = WebSocketMock.CONNECTING;
  readonly OPEN = WebSocketMock.OPEN;
  readonly CLOSING = WebSocketMock.CLOSING;
  readonly CLOSED = WebSocketMock.CLOSED;
  readonly bufferedAmount = 0;
  readonly extensions = '';
  readonly protocol = '';
  readonly url: WebSocket['url'];
  onopen: WebSocket['onopen'] = null;
  onerror: WebSocket['onerror'] = null;
  onclose: WebSocket['onclose'] = null;
  onmessage: WebSocket['onmessage'] = null;
  readyState: WebSocket['readyState'] = WebSocketMock.CONNECTING;
  binaryType: WebSocket['binaryType'] = 'blob';

  constructor(
    url: ConstructorParameters<typeof WebSocket>[0],
    _protocols?: ConstructorParameters<typeof WebSocket>[1],
  ) {
    super();
    this.url = url.toString();
    this.forwardEventsToHandlers();
    sockets.push(this);
    changed();
    this.openSoon();
  }

  private forwardEventsToHandlers(): void {
    this.addEventListener('open', (event): void => {
      this.onopen?.call(this, event);
    });
    this.addEventListener('error', (event): void => {
      this.onerror?.call(this, event);
    });
    this.addEventListener('close', (event): void => {
      if (event instanceof CloseEvent) this.onclose?.call(this, event);
    });
    this.addEventListener('message', (event): void => {
      if (event instanceof MessageEvent) this.onmessage?.call(this, event);
    });
  }

  private openSoon(): void {
    setTimeout(() => {
      if (this.readyState !== WebSocketMock.CONNECTING) return;
      this.readyState = WebSocketMock.OPEN;
      this.dispatchEvent(new Event('open'));
    });
  }

  isClosed(): boolean {
    return this.readyState === WebSocketMock.CLOSED;
  }

  send(data: Parameters<WebSocket['send']>[0]): void {
    if (data !== 'PING') return;
    setTimeout(() => {
      if (this.readyState !== WebSocketMock.OPEN) return;
      this.dispatchEvent(new MessageEvent('message', { data: 'PONG' }));
    });
  }

  // Native control pongs have no JavaScript event; only the connecting-state error is observable.
  ping(): void {
    if (this.readyState === WebSocketMock.CONNECTING)
      throw new Error('INVALID_STATE_ERR');
  }

  close(
    code: Parameters<WebSocket['close']>[0] = 1000,
    reason: Parameters<WebSocket['close']>[1] = '',
  ): void {
    this.closeWith({ code, reason });
  }

  private closeWith(init: CloseEventInit): void {
    if (this.isClosed()) return;
    this.readyState = WebSocketMock.CLOSED;
    this.dispatchEvent(new CloseEvent('close', init));
    changed();
  }
}

// Swaps the browser's WebSocket for WebSocketMock; the returned function swaps it back.
export function mockWebSocket(): () => void {
  const browserWebSocket = globalThis.WebSocket;
  sockets.splice(0);
  screenSubscriptions = 0;
  statesScreensSaw.clear();
  cachesScreensSaw.clear();
  changed();
  globalThis.WebSocket = WebSocketMock;

  return (): void => {
    globalThis.WebSocket = browserWebSocket;
  };
}
