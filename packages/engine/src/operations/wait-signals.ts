export function observationSignal(
  signal: AbortSignal | undefined,
  detached: AbortSignal,
): AbortSignal {
  return signal ? AbortSignal.any([signal, detached]) : detached;
}

export function stoppingSignal(
  signal: AbortSignal | undefined,
  stopping: AbortSignal | undefined,
): AbortSignal | undefined {
  if (!stopping) return signal;

  return signal ? AbortSignal.any([signal, stopping]) : stopping;
}
