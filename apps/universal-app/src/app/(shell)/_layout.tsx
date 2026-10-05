import { DesktopLayout, useWide } from '@repo/client';
import { Slot } from 'expo-router';
import { useDestination } from '@/navigation/use-destination';

// Picks the shell by width; each section's layout picks how its pages stack.
export default function ShellLayout() {
  const destination = useDestination();
  if (!useWide()) return <Slot />;
  return (
    <DesktopLayout destination={destination}>
      <Slot />
    </DesktopLayout>
  );
}
