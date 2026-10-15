import type * as React from 'react';
import { type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { PhoneTitle } from '#lib/product/navigation/phone-title';
import { Text } from '#primitives/display/text';
import {
  PageTitleRow,
  type PageTitleRowProps,
  type PageTitleSearch,
} from '../generic/page-title-row/page-title-row';
import { ScrollColumnContext } from '../generic/scroll-column';
import { useWide } from '../generic/use-wide/use-wide';
import { cn } from '../generic/utils';

export type SettingsPageSearch = PageTitleSearch;

export interface SettingsPageProps extends PageTitleRowProps {
  caption?: string;
  // A row of controls under the title, such as filters.
  toolbar?: ReactNode;
  children: ReactNode;
}

// The page's centred column, its side padding included. The padding fits the back button's hang (-left-8 in PageTitleRow), so the button stays inside the pane when the column meets the pane's edge.
const settingsColumnMaxWidth = 848;

interface SettingsColumn {
  maxWidth: number;
  paddingLeft: number;
  paddingRight: number;
}

function useSettingsColumn(): SettingsColumn {
  const padding = Number.parseFloat(String(useCSSVariable('--spacing-8')));

  return useMemo(
    () => ({
      maxWidth: settingsColumnMaxWidth,
      paddingLeft: padding,
      paddingRight: padding,
    }),
    [padding],
  );
}

/*
 * One Settings page on a wide window: a centred column under its own title and caption.
 * The content's scroll view spans the pane, so its scrollbar sits at the pane's edge, and keeps its content to the column.
 * A phone's native header shows the title, so there the page is its content alone.
 */
export function SettingsPage(props: SettingsPageProps): ReactNode {
  if (!useWide())
    return (
      <>
        <PhoneTitle title={props.title} />
        {props.children}
      </>
    );

  return <WideSettingsPage {...props} />;
}

function WideSettingsPage(props: SettingsPageProps): React.JSX.Element {
  const settingsColumn = useSettingsColumn();

  return (
    <View className="mt-shell-inset flex-1">
      <SettingsPageTop {...props} column={settingsColumn} />
      <SettingsPageBody column={settingsColumn}>
        {props.children}
      </SettingsPageBody>
    </View>
  );
}

function SettingsPageTop({
  column,
  ...props
}: SettingsPageProps & { column: SettingsColumn }): React.JSX.Element {
  return (
    <View className="w-full self-center pt-[53px] pb-6" style={column}>
      <SettingsPageHeader {...props} />
    </View>
  );
}

function SettingsPageBody(props: {
  column: SettingsColumn;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="min-h-0 flex-1">
      <ScrollColumnContext value={props.column}>
        {props.children}
      </ScrollColumnContext>
    </View>
  );
}

function SettingsPageHeader(props: SettingsPageProps): React.JSX.Element {
  return (
    <View className={cn('gap-4', props.search && 'gap-2')}>
      <View className="gap-1">
        <PageTitleRow {...props} />
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
