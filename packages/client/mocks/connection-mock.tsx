import type * as React from 'react';
import { StrictMode, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppProviders } from '../src/trpc/app-providers';
import { useTRPCClient } from '../src/trpc/context';

interface ConnectionReport {
  open: number;
  closed: number;
  screenSubscriptions: number;
  statesScreensSaw: string[];
}

const sockets: WebSocketMock[] = [];
const statesScreensSaw = new Set<string>();
let screenSubscriptions = 0;
const listeners = new Set<() => void>();
let report = buildReport();

function buildReport(): ConnectionReport {
  const closed = sockets.filter((socket) => socket.isClosed()).length;
  return {
    open: sockets.length - closed,
    closed,
    screenSubscriptions,
    statesScreensSaw: [...statesScreensSaw],
  };
}

function changed(): void {
  report = buildReport();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return (): boolean => listeners.delete(listener);
}

// Stands in for the Server's end of each WebSocket: it opens at once, answers PING, and never answers a request.
class WebSocketMock extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState: number = WebSocketMock.CONNECTING;
  binaryType: BinaryType = 'blob';

  constructor(readonly url: string) {
    super();
    sockets.push(this);
    changed();
    setTimeout(() => {
      if (this.readyState !== WebSocketMock.CONNECTING) return;
      this.readyState = WebSocketMock.OPEN;
      this.dispatchEvent(new Event('open'));
    });
  }

  isClosed(): boolean {
    return this.readyState === WebSocketMock.CLOSED;
  }

  send(data: string): void {
    if (data !== 'PING') return;
    setTimeout(() => {
      if (this.readyState !== WebSocketMock.OPEN) return;
      this.dispatchEvent(new MessageEvent('message', { data: 'PONG' }));
    });
  }

  close(): void {
    if (this.isClosed()) return;
    this.readyState = WebSocketMock.CLOSED;
    this.dispatchEvent(new CloseEvent('close', { code: 1000 }));
    changed();
  }
}

// Swaps the browser's WebSocket for WebSocketMock; the returned function swaps it back.
export function mockWebSocket() {
  const browserWebSocket = globalThis.WebSocket;
  sockets.splice(0);
  screenSubscriptions = 0;
  statesScreensSaw.clear();
  changed();
  globalThis.WebSocket = WebSocketMock as unknown as typeof WebSocket;
  return (): void => {
    globalThis.WebSocket = browserWebSocket;
  };
}

export interface ConnectionMockProps {
  strictMode?: boolean;
}

// Shows AppProviders' Connections over WebSocketMock; it starts unmounted, so StrictMode's double effects reach AppProviders.
export function ConnectionMock({
  strictMode = false,
}: ConnectionMockProps): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const current = useSyncExternalStore(subscribe, () => report);
  const providers = mounted ? (
    <AppProviders serverUrl="ws://127.0.0.1:7337">
      <ScreenMock />
    </AppProviders>
  ) : null;

  return (
    <View>
      <Pressable role="button" onPress={() => setMounted(!mounted)}>
        <Text>{mounted ? 'Unmount' : 'Mount'}</Text>
      </Pressable>
      {strictMode ? <StrictMode>{providers}</StrictMode> : providers}
      <Text>{`Open Connections: ${current.open}`}</Text>
      <Text>{`Closed Connections: ${current.closed}`}</Text>
      <Text>{`Screen subscriptions: ${current.screenSubscriptions}`}</Text>
      <Text>
        {`Connection states the screens saw: ${current.statesScreensSaw.join(', ')}`}
      </Text>
    </View>
  );
}

// Stands in for a screen: subscribes over the Connection from context and records its states; a closed one reads idle.
function ScreenMock(): null {
  const client = useTRPCClient();
  useEffect(() => {
    screenSubscriptions += 1;
    changed();
    const subscription = client.system.clock.subscribe(undefined, {
      onConnectionStateChange: ({ state }) => {
        statesScreensSaw.add(state);
        changed();
      },
    });
    return (): void => subscription.unsubscribe();
  }, [client]);
  return null;
}
