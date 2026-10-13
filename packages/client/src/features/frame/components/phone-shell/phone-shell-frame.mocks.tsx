import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '../../../../lib/generic/primitives/display/text/text';
import { HeaderButton } from '../../../../lib/product/header-button';
import { ScreenHeader } from '../../../../lib/product/navigation/screen-header';
import { PhoneMenuButton } from '../phone-menu-button';
import { type Section, shellSections } from '../shell-sections';
import { PhoneShell, type PhoneShellProps } from './phone-shell';

export interface PhoneShellFrameProps extends Partial<
  Omit<PhoneShellProps, 'children'>
> {
  onSearch?: () => void;
  onFilter?: () => void;
}

type FrameSearch = Pick<PhoneShellFrameProps, 'onSearch' | 'onFilter'>;

interface FrameHeaderProps extends FrameSearch {
  title: string;
}

const frameActions = [
  { key: 'filter', icon: 'filters', verb: 'Filter', callback: 'onFilter' },
  { key: 'search', icon: 'search', verb: 'Search', callback: 'onSearch' },
] as const;

interface FrameHeaderButtonSource {
  action: (typeof frameActions)[number];
  title: string;
  search: FrameSearch;
}

const noop = (): void => {};

function frameHeaderButton({
  action,
  title,
  search,
}: FrameHeaderButtonSource): React.JSX.Element {
  return (
    <HeaderButton
      key={action.key}
      icon={action.icon}
      paired
      accessibilityLabel={`${action.verb} ${title}`}
      onPress={() => search[action.callback]?.()}
    />
  );
}

function FrameHeader({
  title,
  ...search
}: FrameHeaderProps): React.JSX.Element {
  return (
    <ScreenHeader
      title={title}
      left={<PhoneMenuButton />}
      right={frameActions.map((action) =>
        frameHeaderButton({ action, title, search }),
      )}
    />
  );
}

function FrameContent({ section }: { section: Section }): React.JSX.Element {
  return (
    <View testID="phone-shell-content" className="flex-1 gap-3 p-6">
      <Text role="secondary">
        {section === 'sessions'
          ? 'Your Sessions appear here.'
          : `${shellSections[section].title} will appear here.`}
      </Text>
    </View>
  );
}

function frameState({
  drawerOpen = false,
  attentionCount = 1,
}: PhoneShellFrameProps): Pick<
  PhoneShellProps,
  'drawerOpen' | 'attentionCount'
> {
  return { drawerOpen, attentionCount };
}

function frameCallbacks({
  onDrawerOpenChange = noop,
  onSectionChange = noop,
}: PhoneShellFrameProps): Pick<
  PhoneShellProps,
  'onDrawerOpenChange' | 'onSectionChange'
> {
  return { onDrawerOpenChange, onSectionChange };
}

export function PhoneShellFrame({
  selectedSection = 'sessions',
  ...frame
}: PhoneShellFrameProps): React.JSX.Element {
  return (
    <PhoneShell
      selectedSection={selectedSection}
      {...frameState(frame)}
      {...frameCallbacks(frame)}
    >
      <FrameHeader title={shellSections[selectedSection].title} {...frame} />
      <FrameContent section={selectedSection} />
    </PhoneShell>
  );
}
