import { SessionScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';

export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SessionScreen id={id} />;
}
