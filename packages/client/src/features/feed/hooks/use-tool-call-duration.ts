import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import { millisecondsPerSecond } from '#lib/generic/format-elapsed';
import { useClock } from '#lib/generic/use-clock';

export function useToolCallDuration(
  row: ToolCallUpdate | undefined,
  now?: number,
): string | undefined {
  const running = row ? isToolCallRunning(row) : false;
  const clock = useClock(running, now);
  const timing = row?._meta?.argo;
  const end = running ? clock : timing?.endedAt;
  return timing?.startedAt !== undefined && end !== undefined
    ? `${Number((Math.max(0, end - timing.startedAt) / millisecondsPerSecond).toFixed(1))}s`
    : undefined;
}
