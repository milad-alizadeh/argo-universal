import { randomUUID } from 'node:crypto';
import {
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';

type TestConnection = {
  id: string;
  signal: AbortSignal;
  surface: PluginSurface;
  identity?: { readonly serverDevice: true };
};

type ConnectionOptions = {
  surface?: Pick<PluginSurface, 'platform'>;
  connectionId?: string;
  serverDevice?: boolean;
};

export function testConnection(
  signal: AbortSignal,
  { surface, connectionId, serverDevice }: ConnectionOptions,
): TestConnection {
  const connection = {
    id: connectionId ?? randomUUID(),
    signal,
    surface: surfaceOf(surface),
  };

  return serverDevice
    ? { ...connection, identity: { serverDevice: true } }
    : connection;
}

function surfaceOf(surface: ConnectionOptions['surface']): PluginSurface {
  return currentPluginSurface(surface?.platform ?? 'web');
}

// A list's connection: the platform decides how many items each row shows.
export const itemsConnection = ({
  signal,
  platform = 'web',
}: {
  signal: AbortSignal;
  platform?: PluginSurface['platform'];
}): TestConnection => testConnection(signal, { surface: { platform } });
