import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { useWide } from '../generic/use-wide/use-wide';
import { cn } from '../generic/utils';
import { SessionColumn } from './session-column';

export interface PageHeaderProps {
  // A plain title, or a block such as the Session's title over its meta line.
  title: ReactNode;
  // Controls at the column's right end.
  actions?: ReactNode;
  // The row drags the window in Electron, its title and controls still clickable; a header away from the window's top turns it off.
  dragRegion?: boolean;
}

/*
 * A wide page's header row, drawn in the page's own container under the window's top inset and in its centred column.
 * A phone's native header shows the title instead, so there it draws nothing.
 */
export function PageHeader(props: PageHeaderProps): React.JSX.Element | null {
  if (!useWide()) return null;

  return (
    <View testID="page-header" className={pageHeaderClass(props.dragRegion)}>
      <SessionColumn className="flex-row items-start gap-3 pt-3.25">
        <PageHeaderTitle title={props.title} />
        {props.actions && (
          <View className="shrink-0 flex-row items-center gap-1 web:[app-region:no-drag]">
            {props.actions}
          </View>
        )}
      </SessionColumn>
    </View>
  );
}

function pageHeaderClass(dragRegion = true): string {
  return cn(
    'mt-shell-inset h-shell-bar shrink-0',
    dragRegion && 'web:[app-region:drag]',
  );
}

function PageHeaderTitle({
  title,
}: Pick<PageHeaderProps, 'title'>): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 web:[app-region:no-drag]">
      {typeof title === 'string' ? <PageHeaderHeading title={title} /> : title}
    </View>
  );
}

function PageHeaderHeading(props: { title: string }): React.JSX.Element {
  return (
    <Text
      role="heading"
      semanticRole="heading"
      aria-level={2}
      numberOfLines={1}
    >
      {props.title}
    </Text>
  );
}
