import type { HttpServerOptions, HttpSetup } from './http-server';
import type { AppRouterInput } from './router-deps';

// What the Server's own identity supplies instead: its static public key, the name it is announced by, and the Pairing Tickets and registrations the channel shares with the router.
type HttpRouterInput = Omit<
  AppRouterInput,
  'serverPublicKey' | 'discoveryName' | 'tickets' | 'registrations'
>;

export function httpRouterInput(
  options: HttpServerOptions,
  setup: HttpSetup,
  controlToken: string,
): HttpRouterInput {
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
