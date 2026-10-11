import {
  DropdownMenu,
  DropdownMenuItem,
  type DropdownMenuProps,
  RNHostView,
  Text,
} from '@expo/ui/jetpack-compose';
import { defaultMinSize, selectable } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import { MenuCheck } from './menu-check';
import type { MenuProps } from './menu-props';
import { usePrimitiveColor } from './primitive-color';

const menuWidth = 280;
const menuRadius = 16;

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const [open, setOpen] = useState(false);
  if (props.disabled && open) setOpen(false);
  function choose(value: Value): void {
    setOpen(false);
    props.onValueChange(value);
  }
  return (
    <Host matchContents>
      <MenuPopup expanded={open} onDismissRequest={() => setOpen(false)}>
        <DropdownMenu.Trigger>
          <MenuTrigger {...props} onOpen={() => setOpen(true)} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {props.choices.map((choice) => (
            <MenuChoice
              key={choice.value}
              label={choice.label}
              selected={choice.value === props.value}
              onChoose={() => choose(choice.value)}
            />
          ))}
        </DropdownMenu.Items>
      </MenuPopup>
    </Host>
  );
}

function MenuPopup(
  props: Pick<DropdownMenuProps, 'expanded' | 'onDismissRequest' | 'children'>,
): React.JSX.Element {
  const { colors, colorScheme } = useNativeTheme();
  const popupColor = usePrimitiveColor('text-popover dark:text-neutral-900');
  return (
    <DropdownMenu
      {...props}
      color={popupColor}
      borderWidth={1}
      borderColor={colorScheme === 'dark' ? colors.border : undefined}
      cornerRadius={menuRadius}
    />
  );
}

function MenuTrigger<Value extends string>(
  props: MenuProps<Value> & { onOpen: () => void },
): React.JSX.Element {
  const selected = props.choices.find((choice) => choice.value === props.value);
  return (
    <RNHostView matchContents>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel}
        accessibilityValue={{ text: selected?.label ?? props.value }}
        accessibilityState={{ disabled: props.disabled }}
        disabled={props.disabled}
        onPress={props.onOpen}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {props.trigger}
        </View>
      </Pressable>
    </RNHostView>
  );
}

function MenuChoice({
  label,
  selected,
  onChoose,
}: {
  label: string;
  selected: boolean;
  onChoose: () => void;
}): React.JSX.Element {
  const { colors } = useNativeTheme();
  return (
    <DropdownMenuItem
      modifiers={[
        defaultMinSize({ minWidth: menuWidth }),
        selectable(selected, onChoose, 'radioButton'),
      ]}
      elementColors={{
        textColor: colors.popoverForeground,
        disabledTextColor: colors.disabledContent,
        leadingIconColor: colors.popoverForeground,
        trailingIconColor: colors.popoverForeground,
        disabledLeadingIconColor: colors.disabledContent,
        disabledTrailingIconColor: colors.disabledContent,
      }}
      onClick={onChoose}
    >
      <DropdownMenuItem.Text>
        <Text
          color={colors.popoverForeground}
          style={{ typography: 'bodyLarge' }}
        >
          {label}
        </Text>
      </DropdownMenuItem.Text>
      <DropdownMenuItem.TrailingIcon>
        <MenuIndicator selected={selected} />
      </DropdownMenuItem.TrailingIcon>
    </DropdownMenuItem>
  );
}

function MenuIndicator({ selected }: { selected: boolean }): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View
        className="size-icon-menu-check items-center justify-center"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {selected && <MenuCheck />}
      </View>
    </RNHostView>
  );
}
