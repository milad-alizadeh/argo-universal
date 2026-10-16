import type * as React from 'react';
import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { DrawnButton } from '#primitives/buttons/button';
import { ButtonGroup } from '#primitives/buttons/button-group';
import { Menu } from '#primitives/overlays/menu';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { chevron } from './split-button-chevron';
import { menuRows } from './split-button-items';
import type {
  ResolvedSplitProps,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

export type {
  SplitButtonOption,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

type DrawnButtonProps = ComponentProps<typeof DrawnButton>;

type GroupLook = Pick<SplitMenuProps, 'size' | 'primary' | 'disabled'>;

// What the acting half reads.
type ActingLook = Pick<
  ResolvedSplitProps,
  | 'label'
  | 'accessibilityLabel'
  | 'icon'
  | 'onPress'
  | 'disabled'
  | 'size'
  | 'primary'
  | 'narrow'
>;

// ButtonGroup joins its items by passing each a className.
type JoinedMenuProps<Value extends string> = SplitMenuProps<Value> & {
  className?: string;
};

// A button with a chevron that picks what it does or opens actions of its own, from Argo's menu; phones draw it natively.
export function SplitButton<Value extends string>({
  fullWidth,
  ...options
}: SplitButtonProps<Value>): React.JSX.Element {
  const props: ResolvedSplitProps<Value> = {
    ...options,
    narrow: useNarrowLayout(fullWidth),
  };

  return (
    <ButtonGroup className={groupClassName(props)}>
      {leadingItems(props)}
      <SplitMenu {...props} />
    </ButtonGroup>
  );
}

// Full width always, or "narrow" on a compact window only, as Button's fullWidth.
function useNarrowLayout(fullWidth: SplitButtonProps['fullWidth']): boolean {
  const compact = useSizeClassValue({ compact: true, wide: false });

  return fullWidth === true || (fullWidth === 'narrow' && compact);
}

// The compact split dims as one group, so its halves do not dim a second time.
function groupClassName(props: GroupLook): string | undefined {
  if (props.size !== 'xs') return undefined;

  return cn('rounded-md web:shadow-control', props.disabled && 'opacity-35');
}

// The acting button, and the compact split's divider after a filled one.
function leadingItems(props: ActingLook): ReactElement[] {
  const button = <DrawnButton key="button" {...actingProps(props)} />;

  if (props.size === 'xs' && props.primary) return [button, divider];

  return [button];
}

/*
 * The acting half: filled beside a primary chevron, otherwise a text button that gains an edge when narrow,
 * where it fills the row beside its chevron. The compact split's group carries the shadow and the dimming.
 */
function actingProps(props: ActingLook): DrawnButtonProps {
  return {
    label: props.label,
    accessibilityLabel: props.accessibilityLabel,
    icon: props.icon,
    onPress: props.onPress,
    disabled: props.disabled,
    variant: actingVariant(props),
    size: props.size === 'xs' ? 'xs' : 'sm',
    className: actingClassName(props),
  };
}

function actingVariant(
  props: Pick<SplitMenuProps, 'primary' | 'narrow'>,
): DrawnButtonProps['variant'] {
  if (props.primary) return 'default';

  return props.narrow ? 'outline' : 'ghost';
}

function actingClassName(props: GroupLook & { narrow?: boolean }): string {
  if (props.size === 'xs') return 'web:shadow-none opacity-100';

  return props.narrow ? 'flex-1' : '';
}

// Spans the group's height, which grows to the touch size on phones, with its line centred.
const divider = (
  <View key="divider" className="w-px self-stretch justify-center bg-primary">
    <View className="h-3.5 bg-primary-foreground/25" />
  </View>
);

function SplitMenu<Value extends string>(
  props: JoinedMenuProps<Value>,
): ReactNode {
  return (
    <Menu
      {...menuRows(props)}
      disabled={props.disabled}
      accessibilityLabel={props.menuLabel}
      trigger={chevron(props)}
    />
  );
}
