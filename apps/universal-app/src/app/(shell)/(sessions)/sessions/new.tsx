import { NewSessionScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';

export default function NewSessionRoute() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  return <NewSessionScreen projectId={projectId} />;
}
