import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useState } from 'react';
import { useTRPC } from '#features/connection';
import { FirstSessionView } from '../components/first-session-view';
import {
  chooseFirstSession,
  type FirstSessionChoice,
} from '../state/first-session';
import { NewSessionScreen } from './new-session-screen';
import { SessionScreen } from './session-screen';

// The wide window's `/`: the first active Session, or New Session when there is none.
export function FirstSessionScreen(): React.JSX.Element {
  const trpc = useTRPC();
  const list = useQuery(trpc.session.list.queryOptions({ archived: false }));
  const [chosen, setChosen] = useState<FirstSessionChoice | undefined>();
  if (list.isPending) return <FirstSessionView state="loading" />;
  if (list.isError)
    return (
      <FirstSessionView
        state="load-failed"
        onRetry={() => void list.refetch()}
      />
    );
  const next = chooseFirstSession(
    list.data.sessions.map((session) => session.sessionId),
    chosen,
  );
  // Holding the choice keeps the open page while the list changes.
  if (next !== chosen) setChosen(next);
  return (
    <FirstSessionView state="chosen">
      {next === null ? <NewSessionScreen /> : <SessionScreen id={next} />}
    </FirstSessionView>
  );
}
