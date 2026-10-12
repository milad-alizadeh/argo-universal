import type { AgentInstallOperation } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTRPC } from '#features/connection';
function useInstallRefresh(): () => Promise<void> {
  const trpc = useTRPC(),
    cache = useQueryClient();
  return () => cache.invalidateQueries(trpc.agents.pathFilter());
}
const newlyInstalled = (
  operation: AgentInstallOperation,
  previous: string | null,
): boolean =>
  operation.status === 'installed' && previous !== operation.operationId;
export function useCompletedRefresh(
  operation: AgentInstallOperation | undefined,
): void {
  const refresh = useInstallRefresh(),
    previous = useRef<string | null>(null);
  useEffect(() => {
    if (!operation) return;
    if (!newlyInstalled(operation, previous.current)) return;
    previous.current = operation.operationId;
    void refresh();
  }, [operation, refresh]);
}
