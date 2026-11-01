import { AppNavigation } from '../app-navigation';
import { blobsFolderIn } from '../blob';
import { Notifications } from '../notifications';
import { Plugins } from '../plugins';
import type { HttpServerOptions } from './http-server';
import type { AppRouterInput } from './router-deps';

export type HttpSetup = {
  plugins: Plugins;
  blobsFolder: string;
  commandAdmission: AbortController;
  notifications: Notifications;
  appNavigation: AppNavigation;
};

export function prepareHttpSetup(
  options: HttpServerOptions,
  serverId: string,
): HttpSetup {
  return {
    blobsFolder: blobsFolderIn(options.home),
    commandAdmission: options.commandAdmission ?? new AbortController(),
    notifications: new Notifications({ ...options, serverId }),
    appNavigation: new AppNavigation({ serverId }),
    plugins: new Plugins(options),
  };
}

export function httpRouterInput(
  options: HttpServerOptions,
  setup: HttpSetup,
  controlToken: string,
): AppRouterInput {
  const { plugins, commandAdmission, ...shared } = setup;

  return {
    ...options,
    ...shared,
    controlToken,
    sessionCommandSignal: commandAdmission.signal,
    hooks: plugins.hooks,
    plugins: plugins.router,
  };
}
