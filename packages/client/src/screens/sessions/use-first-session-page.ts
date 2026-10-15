import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTRPC } from '#features/connection';
import {
  chooseFirstSession,
  type FirstSessionChoice,
} from '#features/sessions';
import type { FirstPage } from '#lib/product/navigation/navigation';
import { newSessionId } from '../../lib/product/navigation/new-session';

function useListedSessionIds(): string[] | undefined {
  const trpc = useTRPC();
  const list = useQuery(trpc.session.list.queryOptions({ archived: false }));

  // A failed list stays blank: the Sessions sidebar beside it shows the failure's toast, and the list retries when the Connection reopens.
  if (list.isPending || list.isError) return undefined;

  return list.data.sessions.map((session) => session.sessionId);
}

function useFirstSessionChoice(): FirstSessionChoice | undefined {
  const listedIds = useListedSessionIds();
  const [chosen, setChosen] = useState<FirstSessionChoice | undefined>();

  if (listedIds === undefined) return undefined;
  const next = chooseFirstSession(listedIds, chosen);

  // Holding the choice keeps the open page while the list changes.
  if (next !== chosen) setChosen(next);

  return next;
}

// `/sessions`' first page: the first active Session, or New Session when there is none; undefined while the Sessions load.
export function useFirstSessionPage(): FirstPage | undefined {
  const next = useFirstSessionChoice();

  return useMemo(
    () =>
      next === undefined
        ? undefined
        : { page: '[id]', params: { id: next ?? newSessionId } },
    [next],
  );
}
