import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';
import { PhoneStack } from '@/navigation/phone-stack';

export default function IssuesLayout() {
  if (useWide()) return <Slot />;
  return (
    <PhoneStack>
      <Stack.Screen name="index" options={{ title: 'Issues' }} />
    </PhoneStack>
  );
}
