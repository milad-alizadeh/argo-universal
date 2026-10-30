import type { HttpServerOptions, HttpSetup } from './http-server';
import type { AppRouterInput } from './router-deps';

export function httpRouterInput(
  options: HttpServerOptions,
  setup: HttpSetup,
  controlToken: string,
): Omit<AppRouterInput, 'serverPublicKey'> {
  return {
    ...options,
    controlToken,
    blobsFolder: setup.blobsFolder,
    sessionCommandSignal: setup.commandAdmission.signal,
    notifications: setup.notifications,
    hooks: setup.plugins.hooks,
    plugins: setup.plugins.router,
  };
}
