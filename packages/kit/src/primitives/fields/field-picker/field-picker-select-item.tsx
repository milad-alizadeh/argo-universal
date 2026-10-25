import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import { Text, View } from 'react-native';
import { menuRowClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { IconSlot } from '#primitives/content/icon';
import { SelectedCheck } from '#primitives/status/selected-check';
import type { FieldPickerOption } from './field-picker-model';

// A menu row; its check leads, as every popover row (owner, 2026-10-20).
const itemClassName = cn(
  menuRowClassName,
  'active:bg-pressed group relative flex w-full web:focus:bg-hover web:cursor-default web:outline-none web:**:pointer-events-none',
);

export const selectItem = (option: FieldPickerOption): React.JSX.Element => (
  <RadixSelect.Item
    key={option.value}
    value={option.value}
    textValue={option.label}
    className={itemClassName}
  >
    <Check />
    <RadixSelect.ItemText asChild>
      <Text className="type-body select-none">{option.label}</Text>
    </RadixSelect.ItemText>
  </RadixSelect.Item>
);

const Check = (): React.JSX.Element => (
  <IconSlot>
    <RadixSelect.ItemIndicator asChild>
      <View>
        <SelectedCheck className="text-muted-foreground shrink-0" />
      </View>
    </RadixSelect.ItemIndicator>
  </IconSlot>
);
