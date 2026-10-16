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
import { menuRows } from './split-button-items';
import type { SplitButtonProps, SplitMenuProps } from './split-button-props';

export type {
  SplitButtonOption,
  SplitButtonProps,
  SplitMenuProps,
} from './split-button-props';

type GroupLook = Pick<
  SplitMenuProps,
  'size' | 'primary' | 'disabled' | 'className'
>;

type ActingButton = SplitButtonProps['children'];

// A button with a chevron that picks what it does or opens actions of its own, from Argo's menu; phones draw it natively.
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
    'rounded-md web:rounded-control web:shadow-control',
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

// Spans the group's height, which grows to the touch size on phones, with its line centred.
const divider = (
  <View key="divider" className="w-px self-stretch justify-center bg-primary">
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
  return (
    <Menu
      {...menuRows(props)}
      disabled={props.disabled}
      accessibilityLabel={props.menuLabel}
      trigger={chevron({ ...props, height: props.narrow ? height : undefined })}
    />
  );
}
