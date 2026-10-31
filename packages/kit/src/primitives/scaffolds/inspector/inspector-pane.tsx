import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { InspectorActions } from './inspector-actions';

export { InspectorActions } from './inspector-actions';

import { ChromeIconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { InspectorControlsContext } from './inspector-controls-context';
import { isFittedSheet, paneSizing } from './inspector-pane-sizing';
import type { InspectorProps } from './inspector-props';
import { InspectorScroll } from './inspector-scroll';
import { InspectorTabs } from './inspector-tabs';

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
  className: 'size-8 p-0 sm:size-8',
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
    <ChromeIconButton
      {...controlProps}
      accessibilityLabel={control.label}
      onPress={() => onExpandedChange(!expanded)}
      icon={control.icon}
    />
  );
}

function CloseButton(props: InspectorPaneProps): ReactElement {
  return (
    <ChromeIconButton
      {...controlProps}
      accessibilityLabel="Close Inspector"
      onPress={() => props.onOpenChange(false)}
      icon="close"
    />
  );
}

function InspectorTitle(props: { title: string }): ReactElement {
  return (
    <Text
      role="heading"
      accessibilityRole="heading"
      aria-level={2}
      numberOfLines={1}
      className="min-w-0 flex-1"
    >
      {props.title}
    </Text>
  );
}

// Tabs take the title's place; the column's controls stay outside their scroll.
function InspectorHeading(props: InspectorPaneProps): ReactElement {
  if (props.tabs) return <InspectorTabs tabs={props.tabs} />;

  return <InspectorTitle title={props.title} />;
}

// The hosted header shares the compact Workbench card title line's centre.
function InspectorHeader(props: InspectorPaneProps): ReactElement {
  return (
    <View
      className={cn(
        'flex-row items-center gap-2 pr-1',
        use(InspectorControlsContext) ? 'h-frame-control' : 'h-frame-bar',
        props.tabs ? 'pl-3' : 'pl-4 wide:pl-5',
      )}
    >
      <InspectorHeading {...props} />
      <InspectorActions>{props.actions}</InspectorActions>
      <InspectorControls {...props} />
    </View>
  );
}

export type InspectorBodyProps = InspectorProps & {
  surface: string;
  fitContent?: boolean;
};

export function InspectorBody(props: InspectorBodyProps): ReactElement {
  const { toolbar, children, scrollState } = props;

  if (props.contentScrolls) return <OwnedScrollBody {...props} />;

  return (
    <>
      {toolbar}
      <InspectorScroll {...props} key={scrollState?.key}>
        {children}
      </InspectorScroll>
    </>
  );
}

function OwnedScrollBody({
  toolbar,
  children,
}: InspectorBodyProps): ReactElement {
  return (
    <>
      {toolbar}
      {children}
    </>
  );
}

/*
 * Foundations / Inspector: its header with the title, its Actions, expand on a wide window and close, then its
 * content under that header, all on one surface. On the web's sheet it takes the sheet's surface at Paper's height.
 */
export function InspectorPane(props: InspectorPaneProps): ReactElement {
  const surface = usePaneSurface(props);
  const fittedSheet = isFittedSheet(props);

  return (
    <View testID={props.testID} className={cn(paneSizing(props), surface)}>
      {fittedSheet ? props.sheetHeader : <InspectorHeader {...props} />}
      <InspectorBody {...props} surface={surface} fitContent={fittedSheet} />
    </View>
  );
}

function InspectorControls(props: InspectorPaneProps): ReactElement | null {
  if (use(InspectorControlsContext)) return null;

  return (
    <View className="shrink-0 flex-row items-center gap-0.5">
      <ExpandButton {...props} />
      <CloseButton {...props} />
    </View>
  );
}

// A hosted pane inherits the window's glass; sheets and standalone panes own their existing surface.
function usePaneSurface(props: InspectorPaneProps): string {
  if (use(InspectorControlsContext)) return 'bg-transparent';

  return props.inSheet ? 'bg-content' : 'bg-tint';
}
