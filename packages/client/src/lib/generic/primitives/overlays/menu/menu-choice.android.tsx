import {
  CircularProgressIndicator,
  DropdownMenuItem,
  RNHostView,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  type ModifierConfig,
  defaultMinSize,
  selectable,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { IconSlot } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { menuLoadingLabel } from './menu-props';

const menuWidth = 280;

// Material's small indicator, the size of the menu's icons.
const loadingSize = 20;

export type MenuChoiceProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onChoose: () => void;
};

export function MenuChoice(props: MenuChoiceProps): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem
      modifiers={choiceModifiers(props)}
      elementColors={choiceElementColors(colors)}
      enabled={!props.disabled}
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
  disabled?: boolean;
  onPress: () => void;
};

// An action menu's row: its label, and a leading check on the selected action.
export function MenuActionItem(props: MenuActionItemProps): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem
      modifiers={actionModifiers(props)}
      elementColors={choiceElementColors(colors)}
      enabled={!props.disabled}
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

// The menu's only row while its options load: Material's circular indicator and what it waits for.
export function MenuLoadingItem(): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem
      modifiers={[defaultMinSize({ minWidth: menuWidth })]}
      elementColors={choiceElementColors(colors)}
      enabled={false}
    >
      <LoadingIndicator color={colors.mutedForeground} />
      <ChoiceLabel label={menuLoadingLabel} />
    </DropdownMenuItem>
  );
}

function LoadingIndicator(props: { color?: string }): React.JSX.Element {
  return (
    <DropdownMenuItem.LeadingIcon>
      <CircularProgressIndicator
        color={props.color}
        trackColor="transparent"
        modifiers={[size(loadingSize, loadingSize)]}
      />
    </DropdownMenuItem.LeadingIcon>
  );
}

function ChoiceLabel(props: { label: string }): React.JSX.Element {
  const { colors } = useNativeTheme();

  return (
    <DropdownMenuItem.Text>
      <Text color={colors.cardForeground} style={{ typography: 'bodyLarge' }}>
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
    textColor: colors.cardForeground,
    disabledTextColor: colors.disabledContent,
    leadingIconColor: colors.cardForeground,
    trailingIconColor: colors.cardForeground,
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
          <SelectedCheck role="body" className="text-card-foreground" />
        )}
      </IconSlot>
    </RNHostView>
  );
}
