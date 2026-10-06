import {
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
} from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HeaderButton } from '../src/components/HeaderButton';
import { PhoneMenuButton } from '../src/components/PhoneMenuButton';
import { PhoneShell, type PhoneShellProps } from '../src/components/PhoneShell';
import { shellSections } from '../src/components/shell-sections';
import { ScreenHeader } from '../src/navigation/screen-header';
import { Text } from '../src/primitives/text';

export interface PhoneShellMockProps
  extends Partial<Omit<PhoneShellProps, 'children'>> {
  onSearch?: () => void;
  onFilter?: () => void;
}

export function PhoneShellMock({
  selectedSection = 'sessions',
  drawerOpen = false,
  attentionCount = 1,
  onDrawerOpenChange,
  onSectionChange,
  onSearch,
  onFilter,
}: PhoneShellMockProps) {
  const [section, setSection] = useState(selectedSection);
  const [open, setOpen] = useState(drawerOpen);
  const [action, setAction] = useState('');

  useEffect(() => setSection(selectedSection), [selectedSection]);
  useEffect(() => setOpen(drawerOpen), [drawerOpen]);
  const { title } = shellSections[section];

  return (
    <PhoneShell
      selectedSection={section}
      drawerOpen={open}
      attentionCount={attentionCount}
      onDrawerOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onDrawerOpenChange?.(nextOpen);
      }}
      onSectionChange={(nextSection) => {
        setSection(nextSection);
        setAction('');
        onSectionChange?.(nextSection);
      }}
    >
      <ScreenHeader
        title={title}
        left={<PhoneMenuButton attentionCount={attentionCount} />}
        right={[
          <HeaderButton
            key="search"
            icon={MagnifyingGlassIcon}
            paired
            accessibilityLabel={`Search ${title}`}
            onPress={() => {
              setAction('Search opened');
              onSearch?.();
            }}
          />,
          <HeaderButton
            key="filter"
            icon={SlidersHorizontalIcon}
            paired
            accessibilityLabel={`Filter ${title}`}
            onPress={() => {
              setAction('Filter opened');
              onFilter?.();
            }}
          />,
        ]}
      />
      <View testID="phone-shell-content" className="flex-1 gap-3 p-6">
        <Text variant="muted">
          {section === 'sessions'
            ? 'Your Sessions appear here.'
            : `${title} will appear here.`}
        </Text>
        {action ? <Text role="status">{action}</Text> : null}
      </View>
    </PhoneShell>
  );
}
