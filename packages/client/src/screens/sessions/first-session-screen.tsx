import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useState } from 'react';
import { useTRPC } from '#features/connection';
import {
  chooseFirstSession,
  type FirstSessionChoice,
} from '#features/sessions';
import { NewSessionScreen } from './$id/new-session-screen';
import { SessionScreen } from './$id/session-screen';
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

// The wide window's `/`: the first active Session, or New Session when there is none.
export function FirstSessionScreen(): React.JSX.Element {
  const next = useFirstSessionChoice();

  if (next === undefined) return <FirstSessionView state="loading" />;

  return (
    <FirstSessionView state="chosen">
      {next === null ? <NewSessionScreen /> : <SessionScreen id={next} />}
    </FirstSessionView>
  );
}
