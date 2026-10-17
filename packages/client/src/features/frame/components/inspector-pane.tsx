import type * as React from 'react';
import { createContext, use, type ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import type { InspectorState } from '../scaffold/scaffold-geometry';

export interface InspectorPaneProps {
  title: string;
  // True while the Inspector fills the detail area.
  expanded: boolean;
  onStateChange: (state: InspectorState) => void;
  children: ReactNode;
}

type InspectorControlsProps = Pick<
  InspectorPaneProps,
  'expanded' | 'onStateChange'
>;

// True inside the medium window's Inspector sheet, which gives the pane its own surface and height.
export const InspectorInSheet = createContext(false);

const controlIconClass = 'text-muted-foreground';

const controlClass = 'size-7 p-0 sm:size-7';

function ExpandButton(props: InspectorControlsProps): React.JSX.Element {
  const { expanded, onStateChange } = props;

  return (
    <IconButton
      variant="ghost"
      className={controlClass}
      accessibilityLabel={expanded ? 'Restore Inspector' : 'Expand Inspector'}
      onPress={() => onStateChange(expanded ? 'open' : 'expanded')}
      icon={expanded ? 'collapse' : 'expand'}
      iconClassName={controlIconClass}
      size="sm"
    />
  );
}

function CloseButton({
  onStateChange,
}: InspectorControlsProps): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      className={controlClass}
      accessibilityLabel="Close Inspector"
      onPress={() => onStateChange('closed')}
      icon="close"
      iconClassName={controlIconClass}
      size="sm"
    />
  );
}

function InspectorTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <Text
      role="body"
      accessibilityRole="heading"
      aria-level={2}
      numberOfLines={1}
      className="min-w-0 flex-1 font-medium"
    >
      {title}
    </Text>
  );
}

// The sheet rests at one height, so it has no expand button.
function InspectorHeader(
  props: InspectorPaneProps & { inSheet: boolean },
): React.JSX.Element {
  return (
    <View className="mt-frame-inset h-frame-control flex-row items-center gap-1 pl-4 pr-2.5">
      <InspectorTitle title={props.title} />
      {props.inSheet ? null : <ExpandButton {...props} />}
      <CloseButton {...props} />
    </View>
  );
}

/*
 * The Inspector's page, flush with the window's right edge: its header with expand and close, and
 * its content scrolling and fading under that header, all on one surface. In the medium window's
 * sheet it takes the sheet's surface at Paper's height.
 */
export function InspectorPane(props: InspectorPaneProps): React.JSX.Element {
  const inSheet = use(InspectorInSheet);
  const surface = inSheet ? 'bg-content' : 'bg-muted';

  return (
    <View className={cn(inSheet ? 'h-140' : 'flex-1', surface)}>
      <InspectorHeader {...props} inSheet={inSheet} />
      <InspectorScroll surface={surface}>{props.children}</InspectorScroll>
    </View>
  );
}

function InspectorScroll(props: {
  surface: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ScrollFadeView
      testID="desktop-inspector-scroll"
      className="overflow-hidden"
      contentContainerClassName="grow"
      surfaceClassName={props.surface}
    >
      {props.children}
    </ScrollFadeView>
  );
}
