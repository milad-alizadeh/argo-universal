import type { appOperations } from '@repo/contracts/operations';
import type { AppNavigation } from '../app-navigation';
import type { OperationImplementations, OperationsDeps } from './operations';

type AppImplementations = Pick<
  OperationImplementations,
  keyof typeof appOperations
>;

export function createAppOperations(
  deps: Pick<OperationsDeps, 'appNavigation' | 'screenSight'>,
): AppImplementations {
  const navigation: AppNavigation = deps.appNavigation;

  return {
    'app.open': async ({ destination }) => navigation.open(destination),
    // The person's own run; a Session's goes through the runner, which names the Agent as the one asking.
    'app.screenshot': () => deps.screenSight.capture({ kind: 'person' }),
  };
}
