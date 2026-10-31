import type { Server } from 'node:net';
import type { RoutedSetup } from './http-server';
import {
  listenForNetworkAccess,
  type ServerListener,
} from './network-listener';

// Binding the port is all the Supervisor waits for, so a slow background Plugin delays no App.
export async function listenWithPlugins(
  server: Server,
  port: number,
  setup: RoutedSetup,
): Promise<ServerListener> {
  const listener = await bindOrCleanUp(server, port, setup);
  setup.plugins.listening();

  return listener;
}

async function bindOrCleanUp(
  server: Server,
  port: number,
  setup: RoutedSetup,
): Promise<ServerListener> {
  const { enabled } = setup.localNetworkAccess;

  try {
    return await listenForNetworkAccess(server, port, enabled);
  } catch (error) {
    await abandon(setup);
    throw error;
  }
}

async function abandon(setup: RoutedSetup): Promise<void> {
  setup.notifications.close();
  await setup.plugins.close();
}
