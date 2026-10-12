import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconButton } from '#lib/generic/primitives/icon-button';
import { Text } from '#lib/generic/primitives/text';
import { ScrollFadeView } from '#lib/product/scroll-fade';
import type { InspectorState } from './desktop-shell';

export interface InspectorPaneProps {
  title: string;
  // True while the Inspector fills the detail area.
  expanded: boolean;
  onStateChange: (state: InspectorState) => void;
  children: ReactNode;
}

const controlIconClass = 'text-muted-foreground';
const controlClass = 'size-7 p-0 sm:size-7';

// The Inspector's page, flush with the window's right edge: its header with expand and close, and its content scrolling and fading under that header, all on one surface.
export function InspectorPane({
  title,
  expanded,
  onStateChange,
  children,
}: InspectorPaneProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-muted">
      <View className="mt-shell-inset h-shell-control flex-row items-center gap-1 pl-4 pr-2.5">
        <Text
          role="body"
          semanticRole="heading"
          aria-level={2}
          numberOfLines={1}
          className="min-w-0 flex-1 font-medium"
        >
          {title}
        </Text>
        <IconButton
          variant="ghost"
          className={controlClass}
          accessibilityLabel={
            expanded ? 'Restore Inspector' : 'Expand Inspector'
          }
          onPress={() => onStateChange(expanded ? 'open' : 'expanded')}
          icon={expanded ? 'collapse' : 'expand'}
          iconSize="sm"
          iconClassName={controlIconClass}
          size="md"
        />
        <IconButton
          variant="ghost"
          className={controlClass}
          accessibilityLabel="Close Inspector"
          onPress={() => onStateChange('closed')}
          icon="close"
          iconSize="sm"
          iconClassName={controlIconClass}
          size="md"
        />
      </View>
      <ScrollFadeView
        testID="desktop-inspector-scroll"
        className="overflow-hidden"
        contentContainerClassName="grow"
        surfaceClassName="bg-muted"
      >
        {children}
      </ScrollFadeView>
    </View>
  );
}
