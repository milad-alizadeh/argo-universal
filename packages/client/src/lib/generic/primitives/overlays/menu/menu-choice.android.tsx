import { DropdownMenuItem, RNHostView, Text } from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  defaultMinSize,
  selectable,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { IconSlot } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';

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

export type MenuActionItemProps = {
  label: string;
  // Set when the action can be the one the trigger shows now; that one carries a leading check.
  selected?: boolean;
  onPress: () => void;
};

// An action menu's row: its label, and a leading check on the selected action.
export function MenuActionItem(props: MenuActionItemProps): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem
      modifiers={actionModifiers(props)}
      elementColors={choiceElementColors(colors)}
      onClick={props.onPress}
    >
      <ActionCheck selected={props.selected} />
      <ChoiceLabel label={props.label} />
    </DropdownMenuItem>
  );
}

function ActionCheck(props: { selected?: boolean }): React.ReactNode {
  if (props.selected === undefined) return null;

  return (
    <DropdownMenuItem.LeadingIcon>
      <MenuIndicator selected={props.selected} />
    </DropdownMenuItem.LeadingIcon>
  );
}

function actionModifiers(props: MenuActionItemProps): ModifierConfig[] {
  const width = defaultMinSize({ minWidth: menuWidth });

  return props.selected === undefined
    ? [width]
    : [width, selectable(props.selected, props.onPress)];
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
