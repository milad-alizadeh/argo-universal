import { randomUUID } from 'node:crypto';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { serverDeviceIdentity, type RpcConnection } from '../rpc';
import type { AppRouter } from './router';

export type HttpCaller = (
  options?: Parameters<AppRouter['createCaller']>[1],
) => ReturnType<AppRouter['createCaller']>;

type CallerSource = { appRouter: AppRouter; commandAdmission: AbortController };

export function createHttpCaller({
  appRouter,
  commandAdmission,
}: CallerSource): HttpCaller {
  return (options) =>
    appRouter.createCaller(
      {
        connection: connectionOf(options?.signal ?? commandAdmission.signal),
      },
      options,
    );
}

function connectionOf(signal: AbortSignal): RpcConnection {
  return {
    id: randomUUID(),
    signal,
    surface: currentPluginSurface('web'),
    identity: serverDeviceIdentity,
  };
}
