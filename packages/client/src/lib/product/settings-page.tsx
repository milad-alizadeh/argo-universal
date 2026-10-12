import type * as React from 'react';
import { type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Text } from '#primitives/text';
import {
  PageTitleRow,
  type PageTitleRowProps,
  type PageTitleSearch,
} from '../generic/page-title-row';
import { ScrollColumnContext } from '../generic/scroll-column';
import { useWide } from '../generic/use-wide';
import { cn } from '../generic/utils';

export type SettingsPageSearch = PageTitleSearch;

export interface SettingsPageProps extends PageTitleRowProps {
  caption?: string;
  // A row of controls under the title, such as filters.
  toolbar?: ReactNode;
  children: ReactNode;
}

// The page's centred column, its side padding included. The left padding fits the back button's hang (-left-8 in PageTitleRow), so the button stays inside the pane when the column meets the pane's edge.
const settingsColumnMaxWidth = 848;

function useSpacing(name: string): number {
  return Number.parseFloat(String(useCSSVariable(name)));
}

function useSettingsColumn(): {
  maxWidth: number;
  paddingLeft: number;
  paddingRight: number;
} {
  const paddingLeft = useSpacing('--spacing-8');
  const paddingRight = useSpacing('--spacing-6');
  return useMemo(
    () => ({ maxWidth: settingsColumnMaxWidth, paddingLeft, paddingRight }),
    [paddingLeft, paddingRight],
  );
}

/*
 * One Settings page on a wide window: a centred column under its own title and caption.
 * The content's scroll view spans the pane, so its scrollbar sits at the pane's edge, and keeps its content to the column.
 * A phone's native header already shows the title, so there the page is its content alone.
 */
export function SettingsPage(props: SettingsPageProps): ReactNode {
  const settingsColumn = useSettingsColumn();
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
