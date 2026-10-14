import type * as React from 'react';
import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  useState,
} from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ButtonGroup } from '#primitives/buttons/button-group';
import { Menu } from '#primitives/overlays/menu';
import { chevron } from './split-button-chevron';
import type {
  SplitButtonProps,
  SplitMenuItems,
  SplitMenuProps,
} from './split-button-props';
import { ChoiceSheet } from './split-button-sheet';

export type {
  SplitButtonChoice,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

type GroupLook = Pick<
  SplitMenuProps,
  'size' | 'primary' | 'disabled' | 'className'
>;

type ActingButton = SplitButtonProps['children'];

// A button with a chevron that picks what it does or opens actions of its own; wide opens a menu, narrow a Sheet.
export function SplitButton<Value extends string>({
  children,
  ...props
}: SplitButtonProps<Value>): React.JSX.Element {
  const [height, onLayout] = useGroupHeight();

  return (
    <ButtonGroup className={groupClassName(props)} onLayout={onLayout}>
      {leadingItems(children, props)}
      <SplitMenu {...props} height={height} />
    </ButtonGroup>
  );
}

// The compact split dims as one group, so its halves do not dim a second time.
function groupClassName(props: GroupLook): string | undefined {
  if (props.size !== 'xs') return props.className;

  return cn(
    'rounded-md web:shadow-xs',
    props.disabled && 'opacity-35',
    props.className,
  );
}

// The acting button, and the compact split's divider after a filled one.
function leadingItems(
  button: ActingButton,
  props: GroupLook,
): ActingButton | ReactElement[] {
  if (props.size !== 'xs') return button;

  return props.primary ? [undimmed(button), divider] : [undimmed(button)];
}

function undimmed(button: ActingButton): ReactElement {
  return cloneElement(button, {
    key: 'button',
    className: cn(button.props.className, 'opacity-100'),
  });
}

const divider = (
  <View key="divider" className="h-7 w-px justify-center bg-primary">
    <View className="h-3.5 bg-primary-foreground/25" />
  </View>
);

// The group's laid-out height, which the narrow chevron matches.
function useGroupHeight(): [
  number | undefined,
  (event: LayoutChangeEvent) => void,
] {
  const [height, setHeight] = useState<number>();

  return [height, ({ nativeEvent }) => setHeight(nativeEvent.layout.height)];
}

function SplitMenu<Value extends string>({
  height,
  ...props
}: SplitMenuProps<Value> & { height?: number }): ReactNode {
  return props.narrow ? (
    <ChoiceSheet {...props} height={height} />
  ) : (
    <Menu
      {...menuItems(props)}
      disabled={props.disabled}
      accessibilityLabel={props.menuLabel}
      trigger={chevron(props)}
    />
  );
}

function menuItems<Value extends string>(
  props: SplitMenuItems<Value>,
): SplitMenuItems<Value> {
  if (props.actions) return { actions: props.actions };
  const { choices, value, onValueChange } = props;

  return { choices, value, onValueChange };
}
