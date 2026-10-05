import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { useWide } from '../navigation/use-wide';
import { useTRPC } from '../trpc/context';
import { NewSessionScreen } from './PlaceholderScreens';
import { SessionScreen } from './SessionScreen';

// The `/` section root: its list on a phone, and the detail beside the sidebar list on a wide window.
export function SessionsScreen() {
  return useWide() ? <FirstSessionDetail /> : <SessionsList />;
}

// Placeholder until the Sessions list screen is built.
export function SessionsList() {
  return (
    <View className="flex-1 p-6">
      <Text variant="muted">Sessions will appear here.</Text>
    </View>
  );
}

// A wide window opens the first active Session, or New Session when there is none.
function FirstSessionDetail() {
  const trpc = useTRPC();
  const list = useQuery(trpc.session.list.queryOptions({ archived: false }));
  if (list.isPending) return <View className="flex-1 bg-background" />;
  const first = list.data?.sessions[0];
  return first ? <SessionScreen id={first.sessionId} /> : <NewSessionScreen />;
}
