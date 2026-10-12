import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/icon-button';
import { SearchField, type SearchFieldProps } from '#primitives/search-field';
import { Text } from '#primitives/text';
import { ScrollColumnContext } from '../generic/scroll-column';
import { useWide } from '../generic/use-wide';
import { cn } from '../generic/utils';

export type SettingsPageSearch = Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText'
>;

export interface SettingsPageProps {
  title: string;
  caption?: string;
  // Controls that sit to the right of the title.
  actions?: ReactNode;
  // An image before the title, and a badge after it, such as an Agent's icon and status.
  icon?: ReactNode;
  badge?: ReactNode;
  // A row of controls under the title, such as filters.
  toolbar?: ReactNode;
  // Search, last after the actions, opens a field over the whole title row.
  search?: SettingsPageSearch;
  // A drill-in page returns to the page it came from.
  onBack?: () => void;
  children: ReactNode;
}

// The page's centred column, its 24 side padding included.
const settingsColumn = { maxWidth: 848, paddingLeft: 24, paddingRight: 24 };

/*
 * One Settings page on a wide window: a centred column under its own title and caption.
 * The content's scroll view spans the pane, so its scrollbar sits at the pane's edge, and keeps its content to the column.
 * A phone's native header already shows the title, so there the page is its content alone.
 */
export function SettingsPage(props: SettingsPageProps): ReactNode {
  if (!useWide()) return props.children;
  return (
    <View className="mt-shell-inset flex-1">
      <View
        className="w-full self-center pt-[53px] pb-6"
        style={settingsColumn}
      >
        <SettingsPageHeader {...props} />
      </View>
      <View className="min-h-0 flex-1">
        <ScrollColumnContext value={settingsColumn}>
          {props.children}
        </ScrollColumnContext>
      </View>
    </View>
  );
}

function SettingsPageHeader(props: SettingsPageProps): React.JSX.Element {
  return (
    <View className={cn('gap-4', props.search && 'gap-2')}>
      <View className="gap-1">
        <TitleRow {...props} />
        {props.caption ? (
          <Text role="body" className="text-muted-foreground">
            {props.caption}
          </Text>
        ) : null}
      </View>
      {props.toolbar}
    </View>
  );
}

function TitleRow(props: SettingsPageProps): React.JSX.Element {
  const back = props.onBack ? <BackButton onBack={props.onBack} /> : null;
  if (props.search)
    return (
      <View className="flex-row items-center">
        {back}
        <SearchField
          {...props.search}
          title={<Title {...props} />}
          actions={props.actions}
        />
      </View>
    );
  return (
    <View className="flex-row items-center gap-4">
      {back}
      <View className="min-w-0 flex-1">
        <Title {...props} />
      </View>
      {props.actions}
    </View>
  );
}

function Title(props: SettingsPageProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      {props.icon}
      <Text
        role="title"
        semanticRole="heading"
        aria-level={1}
        numberOfLines={1}
        className="min-w-0 shrink"
      >
        {props.title}
      </Text>
      {props.badge}
    </View>
  );
}

// The back button hangs in the margin left of the title, so titles line up with or without it.
function BackButton({ onBack }: { onBack: () => void }): React.JSX.Element {
  return (
    <View className="absolute -left-9 -top-0.5">
      <IconButton
        icon="chevron-left"
        iconSize="xs"
        iconClassName="text-foreground"
        size="sm"
        variant="ghost"
        accessibilityLabel="Back"
        onPress={onBack}
        className="web:[app-region:no-drag]"
      />
    </View>
  );
}
