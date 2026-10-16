import type * as React from 'react';
import { type ReactNode, use, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';
import {
  PageTitleRow,
  type PageTitleRowProps,
  type PageTitleSearch,
} from '../generic/page-title-row/page-title-row';

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
 * A phone's native header shows the title, which the page's screen sets, so there the page is its content alone.
 */
export function SettingsPage(props: SettingsPageProps): ReactNode {
  const wide = useWide();
  const inheritedColumn = use(ScrollColumnContext);
  const settingsColumn = useSettingsColumn();

  // Keep the form's ancestors in place when the window changes Size class, so its draft and open entry editor survive.
  return (
    <View className="flex-1 wide:mt-frame-inset">
      {wide ? <SettingsPageTop {...props} column={settingsColumn} /> : null}
      <SettingsPageBody column={wide ? settingsColumn : inheritedColumn}>
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
    <View className="w-full self-center pt-13 pb-6" style={column}>
      <SettingsPageHeader {...props} />
    </View>
  );
}

function SettingsPageBody(props: {
  column: React.ContextType<typeof ScrollColumnContext>;
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
