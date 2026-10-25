import { randomUUID } from 'node:crypto';
import {
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';

type TestConnection = {
  id: string;
  signal: AbortSignal;
  surface: PluginSurface;
};

type ConnectionOptions = {
  surface?: Pick<PluginSurface, 'platform'>;
  connectionId?: string;
};

export function testConnection(
  signal: AbortSignal,
  { surface, connectionId }: ConnectionOptions,
): TestConnection {
  return {
    id: connectionId ?? randomUUID(),
    signal,
    surface: surfaceOf(surface),
  };
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
