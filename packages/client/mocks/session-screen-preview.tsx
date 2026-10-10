import { PortalHost } from '@rn-primitives/portal';
import type * as React from 'react';
import { View } from 'react-native';
import {
  detailActionsHost,
  detailHeaderHost,
} from '../src/features/sessions/components/session-header';
import {
  SessionScreen,
  type SessionScreenProps,
} from '../src/features/sessions/screens/session-screen';
import { useWide } from '../src/lib/generic/use-wide';

// The Session screen under the wide shell's detail header slots, or the phone's header mock.
export function SessionScreenPreview(
  props: SessionScreenProps,
): React.JSX.Element {
  const wide = useWide();
  return (
    <View className="w-full flex-1 bg-background" style={{ minHeight: 0 }}>
      {wide && (
        <View className="h-shell-bar flex-row items-center gap-2 px-4">
          <View className="min-w-0 flex-1">
            <PortalHost name={detailHeaderHost} />
          </View>
          <View className="flex-row items-center gap-0.5">
            <PortalHost name={detailActionsHost} />
          </View>
        </View>
      )}
      <SessionScreen {...props} />
    </View>
  );
}
