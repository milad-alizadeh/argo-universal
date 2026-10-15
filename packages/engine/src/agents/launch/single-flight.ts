const pending = new Map<string, Promise<void>>();

export const singleFlight = (
  directory: string,
  operation: () => Promise<void>,
): Promise<void> => {
  const existing = pending.get(directory);

  if (existing) return existing;
  const work = operation().finally(() => pending.delete(directory));
  pending.set(directory, work);

  return work;
};
