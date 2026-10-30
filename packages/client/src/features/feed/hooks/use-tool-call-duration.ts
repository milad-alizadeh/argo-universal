import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import { millisecondsPerSecond } from '@repo/kit/format-elapsed';
import { useClock } from '@repo/kit/use-clock';

export function useToolCallDuration(
  row: ToolCallUpdate | undefined,
  now?: number,
): string | undefined {
  const running = row ? isToolCallRunning(row) : false;
  const clock = useClock(running, now);

  return toolCallDuration(startedAt(row), running ? clock : endedAt(row));
}

function toolCallDuration(
  start: number | undefined,
  end: number | undefined,
): string | undefined {
  if (start === undefined || end === undefined) return undefined;

  return `${Number((Math.max(0, end - start) / millisecondsPerSecond).toFixed(1))}s`;
}

function startedAt(row: ToolCallUpdate | undefined): number | undefined {
  return timing(row)?.startedAt;
}

function endedAt(row: ToolCallUpdate | undefined): number | undefined {
  return timing(row)?.endedAt;
}

function timing(
  row: ToolCallUpdate | undefined,
): { startedAt?: number; endedAt?: number } | undefined {
  return row?._meta?.argo;
}
