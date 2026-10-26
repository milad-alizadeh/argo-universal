import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { Text, TextClassContext } from '#primitives/content/text';
import { groupedHeading, useWebGrouped } from '../../../list-grouped';
import {
  type SectionDrawing,
  useSectionDrawing,
} from '../../../list-section-drawing';
import { SkeletonBar } from '../../../list-skeleton';
import { SizeClass } from '../../../size-class/size-class';
import { cn } from '../../../utils';
import type { ListSectionProps } from './list-props';
import { HeaderActions, hasActions } from './list-section-actions';
import { HeaderLeading } from './list-section-leading';
import { HeaderTitleLine } from './list-section-title-line';

/*
 * Kit-only, a data List's header: a desktop sidebar's section (Paper "SessionsList") draws a muted title after a 16
 * glyph 6 before it, its actions always shown 24 wide and 4 apart, 12 in from the rows' edge; its caller spaces it.
 */
export type HeaderProps = Omit<ListSectionProps, 'children'> & {
  sidebar?: boolean;
};

type DrawnHeaderProps = HeaderProps & { drawing: SectionDrawing };

// The drawing's title colour, or a sidebar section's muted title.
const titleLook = (
  props: DrawnHeaderProps,
): Pick<ComponentProps<typeof Text>, 'className' | 'tone'> => ({
  className: props.drawing.title,
  tone: props.sidebar ? ('muted' as const) : undefined,
});

function HeaderTitle(props: DrawnHeaderProps): ReactNode {
  if (props.isLoading)
    return <SkeletonBar kind="title" text={props.title} textRole="heading" />;

  return (
    <Text
      role="heading"
      {...titleLook(props)}
      numberOfLines={1}
      accessibilityRole="heading"
      aria-level={2}
    >
      {props.title}
    </Text>
  );
}

function HeaderContent(props: DrawnHeaderProps): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <HeaderTitleLine title={<HeaderTitle {...props} />} count={props.count} />
      {props.subtitle ? <Text role="secondary">{props.subtitle}</Text> : null}
    </View>
  );
}

function HeaderLabel(props: DrawnHeaderProps): ReactElement {
  return (
    <TextClassContext value={props.drawing.heading}>
      <HeaderLeading {...props} />
      <HeaderContent {...props} />
    </TextClassContext>
  );
}

const labelClassName = (props: DrawnHeaderProps): string =>
  props.sidebar
    ? 'min-h-6 min-w-0 flex-1 flex-row items-center'
    : cn('min-w-0 flex-1 flex-row items-center gap-1', props.drawing.gap);

// A collapsible section's whole label toggles it; its actions stay their own buttons beside it.
function HeaderToggle(props: DrawnHeaderProps): ReactElement {
  if (!props.onExpandedChange || props.isLoading)
    return (
      <View className={labelClassName(props)}>
        <HeaderLabel {...props} />
      </View>
    );

  return <HeaderButton {...props} />;
}

type ExpandedState = Pick<
  PressableProps,
  'accessibilityState' | 'aria-expanded'
>;

const expandedState = (expanded: boolean): ExpandedState => ({
  accessibilityState: { expanded },
  'aria-expanded': expanded,
});

function HeaderButton(props: DrawnHeaderProps): ReactElement {
  const isExpanded = props.isExpanded ?? true;

  return (
    <Pressable
      role="button"
      accessibilityLabel={props.title}
      {...expandedState(isExpanded)}
      onPress={() => props.onExpandedChange?.(!isExpanded)}
      className={cn(labelClassName(props), 'web:select-none')}
    >
      <HeaderLabel {...props} />
    </Pressable>
  );
}

const headerClassName = (
  props: HeaderProps,
  drawing: SectionDrawing,
  grouped: boolean,
): string =>
  props.sidebar
    ? 'group min-h-6 flex-row items-center gap-1 px-3'
    : cn(
        'group flex-row items-start gap-1',
        drawing.inset,
        grouped && groupedHeading,
      );

function HeaderRow(props: HeaderProps & { wide: boolean }): ReactElement {
  const drawing = useSectionDrawing();
  const className = headerClassName(props, drawing, useWebGrouped());

  return (
    <View className={className}>
      <HeaderToggle {...props} drawing={drawing} />
      <HeaderActions
        trailing={props.trailing}
        actions={props.wide ? props.actions : undefined}
        sidebar={props.sidebar}
        title={props.title}
      />
    </View>
  );
}

// A wide header draws its Actions as buttons; below it, a long press or a right-click opens them, under the section's title.
export function SectionHeader(props: HeaderProps): ReactNode {
  return (
    <SizeClass
      wide={<HeaderRow {...props} wide />}
      compact={
        <ContextActions actions={props.actions} menu={{ title: props.title }}>
          <HeaderRow {...props} wide={false} />
        </ContextActions>
      }
    />
  );
}

// A data List's section header, from its `getSectionKey` sections: 16 below the previous section, as a List.Section's; a sidebar's caller spaces its own.
export function ListSectionHeader(props: HeaderProps): ReactNode {
  if (props.sidebar) return <SectionHeader {...props} />;

  return (
    <View className="pt-2">
      <SectionHeader {...props} />
    </View>
  );
}

export function hasSectionHeader(props: ListSectionProps): boolean {
  return [
    props.title,
    props.leading,
    props.trailing,
    hasActions(props.actions),
    props.onExpandedChange,
    props.isLoading,
  ].some(Boolean);
}
