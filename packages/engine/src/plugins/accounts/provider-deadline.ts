import type { PluginClock } from '../clock';

const providerLimitMs = 3000;

// The provider's whole operation, including waking its worker, has one deadline.
export async function providerDeadline<T>(
  clock: PluginClock,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T | null> {
  const deadline = providerTimeout(clock);

  try {
    return await firstResult(run(deadline.signal), deadline.expired);
  } finally {
    deadline.cancel();
  }
}

type Deadline = {
  signal: AbortSignal;
  expired: Promise<null>;
  cancel: () => void;
};

function providerTimeout(clock: PluginClock): Deadline {
  const controller = new AbortController();
  const expired = Promise.withResolvers<null>();

  const cancel = clock.schedule(
    expire(controller, expired.resolve),
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
  resolve: (value: null) => void,
): () => void {
  return () => {
    controller.abort();
    resolve(null);
  };
}

const firstResult = <T>(
  work: Promise<T>,
  expired: Promise<null>,
): Promise<T | null> => Promise.race([work.catch(() => null), expired]);

const releaseTimeout =
  (cancel: () => void, controller: AbortController): (() => void) =>
  () => {
    cancel();
    controller.abort();
  };
