import { describe, expect, it, vi } from 'vitest';
import type { AppServer } from './app-server';
import { ServerConnectionsStore } from './server-connections-store';
import {
  type TestConnection,
  testConnection,
  testServerUrl,
} from './server-connections.mocks';

interface Opened {
  store: ServerConnectionsStore<TestConnection>;
  open: ReturnType<typeof vi.fn>;
  held: () => TestConnection[];
}

function holding(servers: readonly AppServer[]): Opened {
  const open = vi.fn<typeof testConnection>(testConnection);
  const store = new ServerConnectionsStore<TestConnection>(open);
  store.hold(servers);

  return {
    store,
    open,
    held: () => [...store.getSnapshot().values()],
  };
}

const ownUrl = testServerUrl('this-device.local');

const studioUrl = testServerUrl('studio.local');

const ownId = 'server-device';

const own: AppServer = {
  id: ownId,
  name: 'This computer',
  serverDevice: true,
  url: ownUrl,
};

const studio: AppServer = {
  id: 'studio-key',
  name: 'Studio',
  serverDevice: false,
  url: studioUrl,
};

// A Server paired but never reached from this network: the App has no address to open a Connection to.
const bench: AppServer = {
  id: 'bench-key',
  name: 'Workshop bench',
  serverDevice: false,
};

describe("the App's Connections", () => {
  it('holds one to each Server it has an address for', () => {
    const { store, held } = holding([own, studio]);

    expect([...store.getSnapshot().keys()]).toEqual([
      'server-device',
      'studio-key',
    ]);
    expect(held().map((connection) => connection.url)).toEqual([
      ownUrl,
      studioUrl,
    ]);
  });

  it('holds none to a Server it has no address for', () => {
    const { store } = holding([own, bench]);

    expect([...store.getSnapshot().keys()]).toEqual([ownId]);
  });

  it('holds one Connection to a Server kept twice, and leaves none behind', () => {
    const { store, open } = holding([
      own,
      studio,
      { ...studio, name: 'Studio again' },
    ]);

    expect(store.getSnapshot().size).toBe(2);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('keeps the Connections it already holds when the list is read again', () => {
    const { store, open, held } = holding([own]);
    const first = held()[0];

    store.hold([own, studio]);

    expect(first?.closed()).toBe(false);
    expect(store.getSnapshot().get(ownId)).toBe(first);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('closes the Connection to a Server it no longer holds', () => {
    const { store, held } = holding([own, studio]);
    const toStudio = held()[1];

    store.hold([own]);

    expect(toStudio?.closed()).toBe(true);
    expect([...store.getSnapshot().keys()]).toEqual([ownId]);
  });

  it('opens a Connection again to a Server that has moved', () => {
    const { store, held } = holding([studio]);
    const first = held()[0];
    const moved = testServerUrl('studio.local', 4100);

    store.hold([{ ...studio, url: moved }]);

    expect(first?.closed()).toBe(true);
    expect(held().map((connection) => connection.url)).toEqual([moved]);
  });

  it('tells its readers when the Connections it holds change', () => {
    const { store } = holding([own]);
    const changed = vi.fn<() => void>();
    store.subscribe(changed);

    store.hold([own, studio]);
    store.hold([own, studio]);

    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('closes every Connection when the App goes', () => {
    const { store, held } = holding([own, studio]);
    const open = held();

    store.closeAll();

    expect(open.map((connection) => connection.closed())).toEqual([true, true]);
    expect(store.getSnapshot().size).toBe(0);
  });
});
