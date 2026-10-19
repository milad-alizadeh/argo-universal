import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ActionListHeaderContext } from '#primitives/actions/action-list';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import type { InspectorProps } from './inspector-props';

export type InspectorPaneProps = InspectorProps & {
  // Only the wide column expands over the detail; a sheet rests where it is.
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  // The web's sheet: the sheet's own surface at Paper's height.
  inSheet?: boolean;
};

// The header's expand and close: small ghost buttons with muted icons.
const controlProps = {
  variant: 'ghost',
  className: 'size-7 p-0 sm:size-7',
  iconClassName: 'text-muted-foreground',
  size: 'sm',
} as const;

const expandControl = {
  expanded: { label: 'Restore Inspector', icon: 'collapse' },
  restored: { label: 'Expand Inspector', icon: 'expand' },
} as const;

function ExpandButton(props: InspectorPaneProps): ReactElement | null {
  if (!props.onExpandedChange) return null;

  return (
    <ExpandControl
      expanded={props.expanded === true}
      onExpandedChange={props.onExpandedChange}
    />
  );
}

type ExpandControlProps = Required<
  Pick<InspectorPaneProps, 'expanded' | 'onExpandedChange'>
>;

function ExpandControl({
  expanded,
  onExpandedChange,
}: ExpandControlProps): ReactElement {
  const control = expandControl[expanded ? 'expanded' : 'restored'];

  return (
    <IconButton
      {...controlProps}
      accessibilityLabel={control.label}
      onPress={() => onExpandedChange(!expanded)}
      icon={control.icon}
    />
  );
}

function CloseButton(props: InspectorPaneProps): ReactElement {
  return (
    <IconButton
      {...controlProps}
      accessibilityLabel="Close Inspector"
      onPress={() => props.onOpenChange(false)}
      icon="close"
    />
  );
}

// The Inspector's own Actions draw in its header, never in the Page header around it.
export function InspectorActions(props: { children: ReactNode }): ReactNode {
  if (!props.children) return null;

  return (
    <ActionListHeaderContext value={undefined}>
      {props.children}
    </ActionListHeaderContext>
  );
}

function InspectorTitle(props: { title: string }): ReactElement {
  return (
    <Text
      role="body"
      accessibilityRole="heading"
      aria-level={2}
      numberOfLines={1}
      className="min-w-0 flex-1 font-medium"
    >
      {props.title}
    </Text>
  );
}

function InspectorHeader(props: InspectorPaneProps): ReactElement {
  return (
    <View className="mt-frame-inset h-frame-control flex-row items-center gap-1 pl-4 pr-2.5">
      <InspectorTitle title={props.title} />
      <InspectorActions>{props.actions}</InspectorActions>
      <ExpandButton {...props} />
      <CloseButton {...props} />
    </View>
  );
}

// The toolbar, then the content scrolling and fading under it on the Inspector's surface.
const scrollProps = {
  testID: 'desktop-inspector-scroll',
  className: 'overflow-hidden',
  contentContainerClassName: 'grow',
};

export function InspectorBody({
  toolbar,
  children,
  surface,
}: InspectorProps & { surface: string }): ReactElement {
  return (
    <>
      {toolbar}
      <ScrollFadeView {...scrollProps} surfaceClassName={surface}>
        {children}
      </ScrollFadeView>
    </>
  );
}

/*
 * Foundations / Inspector: its header with the title, its Actions, expand on a wide window and close, then its
 * content under that header, all on one surface. On the web's sheet it takes the sheet's surface at Paper's height.
 */
export function InspectorPane(props: InspectorPaneProps): ReactElement {
  const surface = props.inSheet ? 'bg-content' : 'bg-tint';

  return (
    <View
      testID={props.testID}
      className={cn(props.inSheet ? 'h-140' : 'flex-1', surface)}
    >
      <InspectorHeader {...props} />
      <InspectorBody {...props} surface={surface} />
    </View>
  );
}
