const millisecondsPerSecond = 1000;

export function nextIntervalAt(
  nextAt: number,
  intervalSeconds: number,
  now: number,
): number {
  const period = intervalSeconds * millisecondsPerSecond;

  return nextAt + (Math.floor((now - nextAt) / period) + 1) * period;
}
