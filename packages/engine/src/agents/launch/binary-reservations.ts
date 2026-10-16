const reservations = new Map<string, number>();

const operations = new Map<string, Promise<void>>();

const decrement = (directory: string): void => {
  const remaining = (reservations.get(directory) ?? 1) - 1;

  if (remaining > 0) reservations.set(directory, remaining);
  else reservations.delete(directory);
};

const releaseOnAbort = (
  directory: string,
  signal: AbortSignal,
): (() => void) => {
  let released = false;

  const release = (): void => {
    if (released) return;
    released = true;
    signal.removeEventListener('abort', release);
    decrement(directory);
  };

  signal.addEventListener('abort', release, { once: true });

  return release;
};

export const reserveVersion = (
  directory: string,
  signal: AbortSignal,
): (() => void) => {
  signal.throwIfAborted();
  reservations.set(directory, (reservations.get(directory) ?? 0) + 1);

  return releaseOnAbort(directory, signal);
};

export const isVersionReserved = (directory: string): boolean =>
  reservations.has(directory);

const settled = (): void => {};

export const serializeBinary = async <Result>(
  base: string,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const result = (operations.get(base) ?? Promise.resolve()).then(operation);
  const tail = result.then(settled, settled);
  operations.set(base, tail);

  try {
    return await result;
  } finally {
    if (operations.get(base) === tail) operations.delete(base);
  }
};
