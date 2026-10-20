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

export function testConnection(
  signal: AbortSignal,
  surface: Pick<PluginSurface, 'platform'> | undefined,
): TestConnection {
  return {
    id: randomUUID(),
    signal,
    surface: currentPluginSurface(surface?.platform ?? 'web'),
  };
}
