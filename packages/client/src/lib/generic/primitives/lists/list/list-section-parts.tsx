import type { ReactElement, ReactNode } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';
import { IconButtonBleed } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text, TextClassContext } from '#primitives/content/text';
import {
  type SectionDrawing,
  useSectionDrawing,
} from '../../../list-section-drawing';
import { SkeletonBar } from '../../../list-skeleton';
import { cn } from '../../../utils';
import type { ListSectionProps } from './list-props';

type HeaderProps = Omit<ListSectionProps, 'children'>;

type DrawnHeaderProps = HeaderProps & { drawing: SectionDrawing };

const disclosureIcon = (
  isExpanded?: boolean,
): 'chevron-right' | 'chevron-down' =>
  isExpanded === false ? 'chevron-right' : 'chevron-down';

function disclosure(props: HeaderProps): ReactNode {
  if (!props.onExpandedChange) return null;

  return <Icon role="body" name={disclosureIcon(props.isExpanded)} />;
}

function leadingIcon(props: HeaderProps): ReactNode {
  if (props.isLoading)
    return <View className="size-5 rounded-sm bg-foreground/5 wide:size-4" />;

  return props.leading === undefined ? disclosure(props) : props.leading;
}

// The leading icon sits 8 before the title, in the label's colour, the actions' size.
function HeaderLeading(props: HeaderProps): ReactNode {
  const icon = leadingIcon(props);

  return icon ? (
    <View className="h-6 wide-type:h-5 shrink-0 flex-row items-center pr-1">
      {icon}
    </View>
  ) : null;
}

function HeaderTitle(props: HeaderProps): ReactNode {
  if (props.isLoading)
    return <SkeletonBar kind="title" text={props.title} textRole="heading" />;

  return (
    <Text
      role="heading"
      numberOfLines={1}
      accessibilityRole="heading"
      aria-level={2}
    >
      {props.title}
    </Text>
  );
}

function HeaderContent(props: HeaderProps): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <HeaderTitle {...props} />
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

const labelClassName = (drawing: SectionDrawing): string =>
  cn('min-w-0 flex-1 flex-row items-center gap-1', drawing.gap);

// A collapsible section's whole label toggles it; its actions stay their own buttons beside it.
function HeaderToggle(props: DrawnHeaderProps): ReactElement {
  if (!props.onExpandedChange || props.isLoading)
    return (
      <View className={labelClassName(props.drawing)}>
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
      onLongPress={props.onLongPress}
      className={cn(labelClassName(props.drawing), 'web:select-none')}
    >
      <HeaderLabel {...props} />
    </Pressable>
  );
}

/*
 * Up to two IconButtons, each glyph placed as in a 24 box 4 from the next. Desktop and web show them on hover
 * or keyboard focus, never after a click leaves focus behind; phones always show them.
 */
const actionsClassName =
  'h-6 shrink-0 flex-row items-center gap-3 px-1 wide-type:h-5 web:wide:opacity-0 web:wide:group-hover:opacity-100 web:wide:has-focus-visible:opacity-100';

function HeaderActions({ trailing }: Pick<HeaderProps, 'trailing'>): ReactNode {
  return trailing ? (
    <IconButtonBleed value>
      <View className={actionsClassName}>{trailing}</View>
    </IconButtonBleed>
  ) : null;
}

export function SectionHeader(props: HeaderProps): ReactElement {
  const drawing = useSectionDrawing();

  return (
    <View className={cn('group flex-row items-start gap-1', drawing.inset)}>
      <HeaderToggle {...props} drawing={drawing} />
      <HeaderActions trailing={props.trailing} />
    </View>
  );
}

// A data List's section header, from its `getSectionKey` sections: 16 below the previous section, as a List.Section's.
export function ListSectionHeader(props: HeaderProps): ReactElement {
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
    props.onExpandedChange,
    props.isLoading,
  ].some(Boolean);
}
