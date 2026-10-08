import type * as React from 'react';
import { View } from 'react-native';
import {
  SessionsHeader,
  SessionsScreen,
  useSessionsFilter,
} from '../src/screens/sessions-screen';

// The Sessions list under a plain header row, as a shell draws it.
export function SessionsScreenPreview(): React.JSX.Element {
  const filter = useSessionsFilter();
  return (
    <View className="flex-1 w-full" style={{ minHeight: 0 }}>
      <View className="h-11 wide:h-14 flex-row items-center gap-0.5 px-2">
        <SessionsHeader {...filter} />
      </View>
      <SessionsScreen query={filter.query} archived={filter.archived} />
    </View>
  );
}
