export function nextIntervalAt(
  nextAt: number,
  intervalSeconds: number,
  now: number,
): number {
  const period = intervalSeconds * 1000;
  return nextAt + (Math.floor((now - nextAt) / period) + 1) * period;
}
