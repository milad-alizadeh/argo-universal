import { randomUUID } from 'node:crypto';
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
        connection: {
          id: randomUUID(),
          signal: options?.signal ?? commandAdmission.signal,
        },
      },
      options,
    );
}
