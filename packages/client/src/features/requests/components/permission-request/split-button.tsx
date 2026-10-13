import type * as React from 'react';
import { type ReactElement, type ReactNode, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { ButtonGroup } from '#primitives/buttons/button-group/button-group';
import { Menu } from '#primitives/overlays/menu/menu';
import { chevron, chevronSizes } from './split-button-chevron';
import { ChoiceSheet } from './split-button-sheet';

export interface SplitButtonChoice<Value extends string> {
  value: Value;
  label: string;
}

export interface SplitButtonProps<Value extends string> {
  // The button that acts on the chosen value; it passes className on to its Button.
  children: ReactElement;
  choices: readonly SplitButtonChoice<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  menuLabel: string;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}

// ButtonGroup sets className on this child; the chevron takes it.
export type ChoiceProps<Value extends string> = Omit<
  SplitButtonProps<Value>,
  'className'
> & { className?: string };

// A button with a chevron that picks what the button does; desktop opens a menu, phone a Sheet.
export function SplitButton<Value extends string>(
  props: SplitButtonProps<Value>,
): React.JSX.Element {
  const [height, onLayout] = useGroupHeight();
  return (
    <ButtonGroup className={props.className} onLayout={onLayout}>
      {props.children}
      {useContentWide() ? (
        <ChoiceDropdown {...props} />
      ) : (
        <ChoiceSheet {...props} height={height} />
      )}
    </ButtonGroup>
  );
}

// The group's laid-out height, which the phone chevron matches.
function useGroupHeight(): [
  number | undefined,
  (event: LayoutChangeEvent) => void,
] {
  const [height, setHeight] = useState<number>();
  return [height, ({ nativeEvent }) => setHeight(nativeEvent.layout.height)];
}

function ChoiceDropdown<Value extends string>(
  props: ChoiceProps<Value>,
): ReactNode {
  return (
    <Menu
      disabled={props.disabled}
      accessibilityLabel={props.menuLabel}
      value={props.value}
      choices={props.choices}
      onValueChange={props.onValueChange}
      trigger={chevron(props, cn(chevronSizes.wide, props.className))}
    />
  );
}
