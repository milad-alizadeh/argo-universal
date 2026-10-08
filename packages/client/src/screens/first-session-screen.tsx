import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { LoadError } from '../components/load-error';
import { useTRPC } from '../trpc/context';
import { NewSessionScreen } from './new-session-screen';
import { SessionScreen } from './session-screen';

// The wide window's `/`: the first active Session, or New Session when there is none.
export function FirstSessionScreen() {
  const trpc = useTRPC();
  const list = useQuery(trpc.session.list.queryOptions({ archived: false }));
  const [chosenId, setChosenId] = useState<string | null | undefined>();
  if (list.isPending) return <View className="flex-1 bg-background" />;
  if (list.isError)
    return (
      <LoadError
        title="Couldn't load Sessions"
        description="The Server didn't respond. Check that it's running, then retry."
        onRetry={() => void list.refetch()}
      />
    );
  const sessions = list.data?.sessions ?? [];
  if (
    chosenId === undefined ||
    (chosenId !== null &&
      !sessions.some((session) => session.sessionId === chosenId))
  ) {
    setChosenId(sessions[0]?.sessionId ?? null);
    return <View className="flex-1 bg-background" />;
  }
  return chosenId === null ? (
    <NewSessionScreen />
  ) : (
    <SessionScreen id={chosenId} />
  );
}
