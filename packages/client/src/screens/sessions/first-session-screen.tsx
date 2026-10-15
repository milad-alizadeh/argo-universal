import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { useTRPC } from '#features/connection';
import {
  chooseFirstSession,
  type FirstSessionChoice,
} from '#features/sessions';
import { OpenFirstPage } from '#lib/product/navigation/navigation';
import { newSessionId } from '../../lib/product/navigation/new-session';
import { FirstSessionView } from './first-session-view';

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

// Opens the chosen Session, or New Session when there is none, as `/sessions/[id]`.
function OpenFirstSession({ id }: { id: string | null }): React.JSX.Element {
  const params = useMemo(() => ({ id: id ?? newSessionId }), [id]);

  return <OpenFirstPage page="[id]" params={params} />;
}

// A wide window's `/sessions`: blank while the Sessions load, then it opens the first active Session's page, or New Session when there is none.
export function FirstSessionScreen(): React.JSX.Element {
  const next = useFirstSessionChoice();

  if (next === undefined) return <FirstSessionView state="loading" />;

  return <OpenFirstSession id={next} />;
}
