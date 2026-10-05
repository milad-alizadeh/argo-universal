import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useTRPC } from '../trpc/context';
import { NewSessionScreen } from './PlaceholderScreens';
import { SessionScreen } from './SessionScreen';

// The wide window's `/`: the first active Session, or New Session when there is none.
export function FirstSessionScreen() {
  const trpc = useTRPC();
  const list = useQuery(trpc.session.list.queryOptions({ archived: false }));
  if (list.isPending) return <View className="flex-1 bg-background" />;
  const first = list.data?.sessions[0];
  return first ? <SessionScreen id={first.sessionId} /> : <NewSessionScreen />;
}
