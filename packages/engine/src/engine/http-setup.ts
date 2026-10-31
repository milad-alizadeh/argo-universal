import { blobsFolderIn } from '../blob';
import { LocalNetworkAccess } from '../network-access';
import { Notifications } from '../notifications';
import { ensureControlToken } from '../operations';
import { Plugins } from '../plugins';
import { readServerId } from '../system';
import type { HttpServerOptions } from './http-server';
import { type AppRouter, createAppRouter } from './router';
import { createAppRouterDeps, type AppRouterInput } from './router-deps';

export type HttpSetup = {
  plugins: Plugins;
  blobsFolder: string;
  commandAdmission: AbortController;
  notifications: Notifications;
  localNetworkAccess: LocalNetworkAccess;
};

export type RoutedSetup = HttpSetup & { appRouter: AppRouter };

export async function prepareHttpServer(
  options: HttpServerOptions,
): Promise<RoutedSetup> {
  const serverId = await readServerId(options.database, options.databaseWriter);
  const setup = prepareHttpSetup(options, serverId);

  const controlToken = await ensureControlToken(options.home);

  return {
    ...setup,
    appRouter: createAppRouter(
      createAppRouterDeps(httpRouterInput(options, setup, controlToken)),
    ),
  };
}

function prepareHttpSetup(
  options: HttpServerOptions,
  serverId: string,
): HttpSetup {
  return {
    blobsFolder: blobsFolderIn(options.home),
    commandAdmission: options.commandAdmission ?? new AbortController(),
    notifications: new Notifications({ ...options, serverId }),
    plugins: new Plugins(options),
    localNetworkAccess: new LocalNetworkAccess(
      options.database,
      options.databaseWriter,
    ),
  };
}

function httpRouterInput(
  options: HttpServerOptions,
  setup: HttpSetup,
  controlToken: string,
): AppRouterInput {
  const { commandAdmission, plugins, ...shared } = setup;

  return {
    ...options,
    ...shared,
    controlToken,
    sessionCommandSignal: commandAdmission.signal,
    hooks: plugins.hooks,
    plugins: plugins.router,
  };
}
