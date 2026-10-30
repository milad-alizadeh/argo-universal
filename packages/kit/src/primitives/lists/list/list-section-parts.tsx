import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { Text, TextClassContext } from '#primitives/content/text';
import { useSectionDrawing } from '../../../list-look-context';
import type { SectionDrawing } from '../../../list-look-section';
import { SizeClass } from '../../../size-class/size-class';
import { cn } from '../../../utils';
import type { ListSectionProps } from './list-props';
import { HeaderActions } from './list-section-actions';
import { HeaderLeading } from './list-section-leading';
import { HeaderTitleLine } from './list-section-title-line';

// Kit-only, a data List's header: a desktop sidebar's section draws a muted title after a glyph; its caller spaces it.
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
  if (!props.onExpandedChange)
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
): string =>
  props.sidebar
    ? 'group min-h-6 flex-row items-center gap-1 px-3'
    : cn(
        'group flex-row items-start gap-1',
        drawing.inset,
        drawing.headingBelow,
      );

interface HeaderDrawing {
  drawing: SectionDrawing;
  className: string;
}

function useHeaderDrawing(props: HeaderProps): HeaderDrawing {
  const drawing = useSectionDrawing();

  return { drawing, className: headerClassName(props, drawing) };
}

function HeaderRow(props: HeaderProps & { wide: boolean }): ReactElement {
  const { drawing, className } = useHeaderDrawing(props);

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
