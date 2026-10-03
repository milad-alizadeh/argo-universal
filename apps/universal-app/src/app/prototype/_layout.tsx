// PROTOTYPE: universal Session UI. A phone gets a left drawer of sections, each opening on its list; wide windows get the desktop shell.
import { Slot, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DesktopShell, EventLog, Toast } from '@/prototype/session-ui/shell';
import { useWide } from '@/prototype/session-ui/ui';

export default function PrototypeLayout() {
  const wide = useWide();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {wide ? (
        <DesktopShell>
          <Slot />
        </DesktopShell>
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
      <Toast />
      <EventLog />
    </GestureHandlerRootView>
  );
}
