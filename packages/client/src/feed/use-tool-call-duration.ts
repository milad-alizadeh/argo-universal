import type { ToolCallUpdate } from '@repo/contracts';
import { useEffect, useState } from 'react';

export function useToolCallDuration(
  row: ToolCallUpdate | undefined,
  now?: number,
) {
  const running = row?.status === 'pending' || row?.status === 'in_progress';
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!running || now !== undefined) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, now]);
  const timing = row?._meta?.argo;
  const end = running ? (now ?? clock) : timing?.endedAt;
  return timing?.startedAt !== undefined && end !== undefined
    ? `${Number((Math.max(0, end - timing.startedAt) / 1000).toFixed(1))}s`
    : undefined;
}
