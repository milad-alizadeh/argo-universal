import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { SessionColumn } from '#lib/product/session-column';
import { Text } from '#primitives/content/text';
import { SizeClass } from '../../../lib/generic/size-class/size-class';

export interface SessionHeaderBarProps {
  // A plain title, or a block such as the Session's title over its meta line.
  title: ReactNode;
  // Controls at the column's right end.
  actions?: ReactNode;
  // The row drags the window in Electron, its title and controls still clickable; a header away from the window's top turns it off.
  dragRegion?: boolean;
}

/*
 * A wide Session page's header row, drawn in the page's own container under the window's top inset and in its centred
 * column. A phone's native header shows the title instead, so there it draws nothing. Other pages use the kit's Page.
 */
export function SessionHeaderBar(
  props: SessionHeaderBarProps,
): React.JSX.Element {
  return (
    <SizeClass only="wide">
      <View
        testID="session-header-bar"
        className={headerBarClass(props.dragRegion)}
      >
        <HeaderColumn {...props} />
      </View>
    </SizeClass>
  );
}

function headerBarClass(dragRegion = true): string {
  return cn(
    'mt-frame-inset h-frame-bar shrink-0',
    dragRegion && 'web:[app-region:drag]',
  );
}

function HeaderBarTitle({
  title,
}: Pick<SessionHeaderBarProps, 'title'>): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 web:[app-region:no-drag]">
      {typeof title === 'string' ? <HeaderBarHeading title={title} /> : title}
    </View>
  );
}

function HeaderBarHeading(props: { title: string }): React.JSX.Element {
  return (
    <Text
      role="heading"
      accessibilityRole="heading"
      aria-level={2}
      numberOfLines={1}
    >
      {props.title}
    </Text>
  );
}

function HeaderColumn(props: SessionHeaderBarProps): React.JSX.Element {
  return (
    <SessionColumn className="flex-row items-start gap-3 pt-3.25">
      <HeaderBarTitle title={props.title} />
      {props.actions && (
        <View className="shrink-0 flex-row items-center gap-1 web:[app-region:no-drag]">
          {props.actions}
        </View>
      )}
    </SessionColumn>
  );
}
