import type { AppRouter } from '@repo/api';
import { cleanup, render } from '@testing-library/react';
import * as trpc from '@trpc/client';
import { StrictMode, useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from './app-providers';
import { useTRPCClient } from './context';

interface FakeConnection {
  client: trpc.TRPCClient<AppRouter>;
  closed: boolean;
  close: () => void;
}

const { connections } = vi.hoisted(() => ({
  connections: [] as FakeConnection[],
}));

vi.mock('./create-trpc-client', () => ({
  createTRPCClient: () => {
    const connection: FakeConnection = {
      client: trpc.createTRPCClient<AppRouter>({ links: [] }),
      closed: false,
      close: () => {
        connection.closed = true;
      },
    };
    connections.push(connection);
    return connection;
  },
}));

afterEach(() => {
  cleanup();
  connections.splice(0);
});

const connectionOf = (client: trpc.TRPCClient<AppRouter>) =>
  connections.find((connection) => connection.client === client);

// Records whether the client the screens get is open once effects have run.
function ClientProbe(props: { onClient: (closed: boolean) => void }) {
  const client = useTRPCClient();
  useEffect(() => {
    props.onClient(connectionOf(client)?.closed ?? true);
  });
  return null;
}

describe('AppProviders', () => {
  it('closes its Connection on unmount', () => {
    const view = render(
      <AppProviders serverUrl="ws://127.0.0.1:7337">{null}</AppProviders>,
    );
    expect(connections.length).toBeGreaterThan(0);

    view.unmount();
    expect(connections.every((connection) => connection.closed)).toBe(true);
  });

  it('gives screens an open Connection under StrictMode', async () => {
    const closedStates: boolean[] = [];
    render(
      <StrictMode>
        <AppProviders serverUrl="ws://127.0.0.1:7337">
          <ClientProbe onClient={(closed) => closedStates.push(closed)} />
        </AppProviders>
      </StrictMode>,
    );

    await vi.waitFor(() => expect(closedStates.at(-1)).toBe(false));
    expect(connections.filter((connection) => !connection.closed)).toHaveLength(
      1,
    );
  });
});
