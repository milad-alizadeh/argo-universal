import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { useWide } from '../generic/use-wide';
import { cn } from '../generic/utils';
import { SessionColumn } from './session-layout';

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
export function PageHeader({
  title,
  actions,
  dragRegion = true,
}: PageHeaderProps): React.JSX.Element | null {
  if (!useWide()) return null;
  return (
    <View
      testID="page-header"
      className={cn(
        'mt-shell-inset h-shell-bar shrink-0',
        dragRegion && 'web:[app-region:drag]',
      )}
    >
      <SessionColumn className="flex-row items-start gap-3 pt-3.25">
        <View className="min-w-0 flex-1 web:[app-region:no-drag]">
          {typeof title === 'string' ? (
            <Text
              role="heading"
              semanticRole="heading"
              aria-level={2}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
        {actions && (
          <View className="shrink-0 flex-row items-center gap-1 web:[app-region:no-drag]">
            {actions}
          </View>
        )}
      </SessionColumn>
    </View>
  );
}
