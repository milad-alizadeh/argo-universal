import { DropdownMenuItem, RNHostView, Text } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  defaultMinSize,
  selectable,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { IconSlot } from '../../../symbols/icon';
import { SelectedCheck } from '../../display/selected-check';

const menuWidth = 280;

export type MenuChoiceProps = {
  label: string;
  selected: boolean;
  onChoose: () => void;
};

export function MenuChoice(props: MenuChoiceProps): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem
      modifiers={choiceModifiers(props)}
      elementColors={choiceElementColors(colors)}
      onClick={props.onChoose}
    >
      <ChoiceLabel label={props.label} />
      <ChoiceIndicator selected={props.selected} />
    </DropdownMenuItem>
  );
}

function choiceModifiers(props: MenuChoiceProps): ModifierConfig[] {
  return [
    defaultMinSize({ minWidth: menuWidth }),
    selectable(props.selected, props.onChoose, 'radioButton'),
  ];
}

function ChoiceLabel(props: { label: string }): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem.Text>
      <Text
        color={colors.popoverForeground}
        style={{ typography: 'bodyLarge' }}
      >
        {props.label}
      </Text>
    </DropdownMenuItem.Text>
  );
}

function ChoiceIndicator(props: { selected: boolean }): React.JSX.Element {
  return (
    <DropdownMenuItem.TrailingIcon>
      <MenuIndicator selected={props.selected} />
    </DropdownMenuItem.TrailingIcon>
  );
}

function choiceElementColors(
  colors: NativeColors,
): React.ComponentProps<typeof DropdownMenuItem>['elementColors'] {
  return {
    textColor: colors.popoverForeground,
    disabledTextColor: colors.disabledContent,
    leadingIconColor: colors.popoverForeground,
    trailingIconColor: colors.popoverForeground,
    disabledLeadingIconColor: colors.disabledContent,
    disabledTrailingIconColor: colors.disabledContent,
  };
}

function MenuIndicator({ selected }: { selected: boolean }): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot
        role="body"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {selected && (
          // Material's check glyph is padded, so beside bodyLarge it takes the Body size, not the 14 mark.
          <SelectedCheck role="body" className="text-popover-foreground" />
        )}
      </IconSlot>
    </RNHostView>
  );
}
