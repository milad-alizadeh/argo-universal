import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';
import { PhoneStack } from '@/navigation/phone-stack';

export default function AtlasLayout() {
  if (useWide()) return <Slot />;
  return (
    <PhoneStack>
      <Stack.Screen name="index" options={{ title: 'Atlas' }} />
    </PhoneStack>
  );
}
