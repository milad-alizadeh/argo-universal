import type { HttpServerOptions, HttpSetup } from './http-server';
import type { AppRouterInput } from './router-deps';

export function httpRouterInput(
  options: HttpServerOptions,
  setup: HttpSetup,
  controlToken: string,
): Omit<AppRouterInput, 'serverPublicKey'> {
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
