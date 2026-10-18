import type * as React from 'react';
import { type ReactNode, use, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import {
  PageTitleRow,
  type PageTitleRowProps,
  type PageTitleSearch,
} from '../generic/page-title-row/page-title-row';
import { useWide } from '../generic/use-wide/use-wide';

export type SettingsPageSearch = PageTitleSearch;

export interface SettingsPageProps extends PageTitleRowProps {
  // Agents keeps the narrower side padding and toolbar gap on a wide window too.
  headerFrom?: 'medium' | 'wide';
  caption?: string;
  // A row of controls under the title, such as filters.
  toolbar?: ReactNode;
  // A phone's row of controls under its native header, such as filters.
  phoneToolbar?: ReactNode;
  children: ReactNode;
}

// The page's centred column, its side padding included. The padding fits the back button's hang (-left-8 in PageTitleRow), so the button stays inside the pane when the column meets the pane's edge.
const settingsColumnMaxWidth = 848;

interface SettingsColumn {
  maxWidth: number;
  paddingLeft: number;
  paddingRight: number;
}

function useSettingsColumn(
  from: SettingsPageProps['headerFrom'],
): SettingsColumn {
  const token = columnPaddingToken(from);
  const padding = Number.parseFloat(String(useCSSVariable(token)));

  return useMemo(
    () => ({
      maxWidth: settingsColumnMaxWidth,
      paddingLeft: padding,
      paddingRight: padding,
    }),
    [padding],
  );
}

function columnPaddingToken(from: SettingsPageProps['headerFrom']): string {
  return from === 'medium' ? '--spacing-6' : '--spacing-8';
}

/*
 * One Settings page on a wide window: a centred column under its own title and caption.
 * The content's scroll view spans the pane, so its scrollbar sits at the pane's edge, and keeps its content to the column.
 * A phone's native header shows the title, which the page's screen sets, so there the page is its content alone.
 */
export function SettingsPage(props: SettingsPageProps): ReactNode {
  const showHeader = useShowsHeader();
  const settingsColumn = useSettingsColumn(props.headerFrom);
  const bodyColumn = useBodyColumn(settingsColumn);

  // Keep the form's ancestors in place when the window changes Size class, so its draft and open entry editor survive.
  return (
    <View className="flex-1 wide:mt-frame-inset">
      {showHeader ? (
        <SettingsPageTop {...props} column={settingsColumn} />
      ) : (
        <PhoneToolbar>{props.phoneToolbar}</PhoneToolbar>
      )}
      <SettingsPageBody column={bodyColumn}>{props.children}</SettingsPageBody>
    </View>
  );
}

function useBodyColumn(
  column: SettingsColumn,
): React.ContextType<typeof ScrollColumnContext> {
  const wide = useWide();
  const inherited = use(ScrollColumnContext);

  return wide ? column : inherited;
}

// A wide page draws its own title; the phone shell's header shows it instead.
function useShowsHeader(): boolean {
  return useWide();
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

// On iOS the list's Form keeps its own gap above its first section, so the row adds none below.
const phoneToolbarClass = 'z-10 shrink-0 px-4 py-3 ios:pb-0';

function PhoneToolbar(props: { children: ReactNode }): ReactNode {
  if (!props.children) return null;

  return <View className={phoneToolbarClass}>{props.children}</View>;
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
    <View className={headerClass(props)}>
      <View className="gap-1">
        <PageTitleRow {...props} />
        <SettingsCaption caption={props.caption} />
      </View>
      {props.toolbar}
    </View>
  );
}

function headerClass(props: SettingsPageProps): string {
  return cn(
    'gap-4',
    (props.search || props.headerFrom === 'medium') && 'gap-2',
  );
}

function SettingsCaption(props: Pick<SettingsPageProps, 'caption'>): ReactNode {
  if (!props.caption) return null;

  return (
    <Text role="body" className="text-muted-foreground">
      {props.caption}
    </Text>
  );
}
