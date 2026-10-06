import type { ToolCallUpdate } from '@repo/contracts';
import { useClock } from './use-clock';

export function useToolCallDuration(
  row: ToolCallUpdate | undefined,
  now?: number,
) {
  const running = row?.status === 'pending' || row?.status === 'in_progress';
  const clock = useClock(running, now);
  const timing = row?._meta?.argo;
  const end = running ? clock : timing?.endedAt;
  return timing?.startedAt !== undefined && end !== undefined
    ? `${Number((Math.max(0, end - timing.startedAt) / 1000).toFixed(1))}s`
    : undefined;
}
