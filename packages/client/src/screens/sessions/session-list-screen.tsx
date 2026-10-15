import type * as React from 'react';
import { View } from 'react-native';
import { useSectionFilters } from '#features/frame';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { FirstSessionScreen } from './first-session-screen';
import { LiveSessionList } from './live-session-list';

// `/sessions`: the list under the section's header on a narrow window; a wide window shows the list in the sidebar and opens the first Session's page.
export function SessionListScreen(): React.JSX.Element {
  const { sessions } = useSectionFilters();

  if (useWide()) return <FirstSessionScreen />;

  return (
    <View className="flex-1 bg-content">
      <LiveSessionList {...sessions} />
    </View>
  );
}
