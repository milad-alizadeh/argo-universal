import type { appOperations } from '@repo/contracts/operations';
import type { AppNavigation } from '../app-navigation';
import type { OperationImplementations, OperationsDeps } from './operations';

type AppImplementations = Pick<
  OperationImplementations,
  keyof typeof appOperations
>;

export function createAppOperations(
  deps: Pick<OperationsDeps, 'appNavigation'>,
): AppImplementations {
  const navigation: AppNavigation = deps.appNavigation;

  return {
    'app.open': async ({ destination }) => navigation.open(destination),
  };
}
