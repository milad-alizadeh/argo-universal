import type * as React from 'react';
import { View } from 'react-native';
import {
  SessionsScreen,
  sessionsHeaderItems,
  sessionsHeaderSearch,
  useSessionsFilter,
} from '#features/sessions';
import { useNavigate } from '#lib/product/navigation/context';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PhoneMenuButton } from '../components/phone-menu-button';
import { shellSections } from '../components/shell-sections';

// A narrow web window's Sessions root: its header row with ☰, the title, the filter and search, over the list.
export function SessionsPhoneScreen(): React.JSX.Element {
  const filter = useSessionsFilter();
  const navigate = useNavigate();

  return (
    <View className="flex-1 bg-content">
      {header(filter, () => navigate({ to: 'new-session' }))}
      <SessionsScreen {...filter} />
    </View>
  );
}

function header(
  filter: ReturnType<typeof useSessionsFilter>,
  newSession: () => void,
): React.JSX.Element {
  return (
    <ScreenHeader
      title={shellSections.sessions.title}
      left={<PhoneMenuButton />}
      right={sessionsHeaderItems(filter)}
      search={sessionsHeaderSearch(filter, newSession)}
    />
  );
}
