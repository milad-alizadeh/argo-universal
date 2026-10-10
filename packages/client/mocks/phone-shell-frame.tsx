import type * as React from 'react';
import { View } from 'react-native';
import { PhoneMenuButton } from '../src/features/frame/components/phone-menu-button';
import {
  PhoneShell,
  type PhoneShellProps,
} from '../src/features/frame/components/phone-shell';
import { shellSections } from '../src/features/frame/components/shell-sections';
import { Text } from '../src/lib/generic/primitives/text';
import { HeaderButton } from '../src/lib/product/header-button';
import { ScreenHeader } from '../src/lib/product/navigation/screen-header';

export interface PhoneShellFrameProps extends Partial<
  Omit<PhoneShellProps, 'children'>
> {
  onSearch?: () => void;
  onFilter?: () => void;
}

export function PhoneShellFrame({
  selectedSection = 'sessions',
  drawerOpen = false,
  attentionCount = 1,
  onDrawerOpenChange,
  onSectionChange,
  onSearch,
  onFilter,
}: PhoneShellFrameProps): React.JSX.Element {
  const { title } = shellSections[selectedSection];

  return (
    <PhoneShell
      selectedSection={selectedSection}
      drawerOpen={drawerOpen}
      attentionCount={attentionCount}
      onDrawerOpenChange={onDrawerOpenChange ?? (() => {})}
      onSectionChange={onSectionChange ?? (() => {})}
    >
      <ScreenHeader
        title={title}
        left={<PhoneMenuButton />}
        right={[
          <HeaderButton
            key="search"
            icon="search"
            paired
            accessibilityLabel={`Search ${title}`}
            onPress={() => {
              onSearch?.();
            }}
          />,
          <HeaderButton
            key="filter"
            icon="filters"
            paired
            accessibilityLabel={`Filter ${title}`}
            onPress={() => {
              onFilter?.();
            }}
          />,
        ]}
      />
      <View testID="phone-shell-content" className="flex-1 gap-3 p-6">
        <Text variant="muted">
          {selectedSection === 'sessions'
            ? 'Your Sessions appear here.'
            : `${title} will appear here.`}
        </Text>
      </View>
    </PhoneShell>
  );
}
