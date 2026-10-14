import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Text } from '#primitives/display/text/text';
import type { InspectorState } from './desktop-shell/desktop-shell-props';

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
      size="md"
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
      size="md"
    />
  );
}

function InspectorTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <Text
      role="body"
      semanticRole="heading"
      aria-level={2}
      numberOfLines={1}
      className="min-w-0 flex-1 font-medium"
    >
      {title}
    </Text>
  );
}

function InspectorHeader(props: InspectorPaneProps): React.JSX.Element {
  return (
    <View className="mt-shell-inset h-shell-control flex-row items-center gap-1 pl-4 pr-2.5">
      <InspectorTitle title={props.title} />
      <ExpandButton {...props} />
      <CloseButton {...props} />
    </View>
  );
}

// The Inspector's page, flush with the window's right edge: its header with expand and close, and its content scrolling and fading under that header, all on one surface.
export function InspectorPane(props: InspectorPaneProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-muted">
      <InspectorHeader {...props} />
      <ScrollFadeView
        testID="desktop-inspector-scroll"
        className="overflow-hidden"
        contentContainerClassName="grow"
        surfaceClassName="bg-muted"
      >
        {props.children}
      </ScrollFadeView>
    </View>
  );
}
