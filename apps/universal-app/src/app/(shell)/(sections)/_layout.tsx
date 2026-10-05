import { PhoneSectionsLayout, sectionOf, useWide } from '@repo/client';
import { Slot, usePathname } from 'expo-router';
import { destinationFor } from '@/navigation/paths';

// The phone drawer of sections. A wide window draws the section list in the desktop sidebar instead.
export default function SectionsLayout() {
  const wide = useWide();
  const pathname = usePathname();
  if (wide) return <Slot />;
  return (
    <PhoneSectionsLayout
      section={sectionOf(destinationFor(pathname) ?? { to: 'sessions' })}
    >
      <Slot />
    </PhoneSectionsLayout>
  );
}
