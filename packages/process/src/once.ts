// Runs `run` on the first call; every later call answers with that first result.
export function once<T>(run: () => T): () => T {
  let first: { result: T } | undefined;

  return (): T => {
    first ??= { result: run() };

    return first.result;
  };
}
