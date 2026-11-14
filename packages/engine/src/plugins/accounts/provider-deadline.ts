import type { PluginClock } from '../clock';
import { accountUnavailable } from './account-unavailable';

const providerLimitMs = 3000;

// The provider's whole operation, including waking its worker, has one deadline.
export async function providerDeadline<T>(
  clock: PluginClock,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const deadline = providerTimeout(clock);

  try {
    return await Promise.race([run(deadline.signal), deadline.expired]);
  } catch {
    throw accountUnavailable();
  } finally {
    deadline.cancel();
  }
}

type Deadline = {
  signal: AbortSignal;
  expired: Promise<never>;
  cancel: () => void;
};

function providerTimeout(clock: PluginClock): Deadline {
  const controller = new AbortController();
  const expired = Promise.withResolvers<never>();

  const cancel = clock.schedule(
    expire(controller, expired.reject),
    providerLimitMs,
  );

  return {
    signal: controller.signal,
    expired: expired.promise,
    cancel: releaseTimeout(cancel, controller),
  };
}

function expire(
  controller: AbortController,
  reject: (reason: Error) => void,
): () => void {
  return () => {
    reject(accountUnavailable());
    controller.abort();
  };
}

const releaseTimeout =
  (cancel: () => void, controller: AbortController): (() => void) =>
  () => {
    cancel();
    controller.abort();
  };
