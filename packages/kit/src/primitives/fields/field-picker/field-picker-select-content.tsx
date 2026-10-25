import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import { View } from 'react-native';
import {
  menuInsetClassName,
  menuRowsClassName,
  menuSurfaceClassName,
} from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { TextClassContext } from '#primitives/content/text';
import type { FieldPickerOption } from './field-picker-model';
import { selectItem } from './field-picker-select-item';

const popper = {
  position: 'popper',
  align: 'start',
  sideOffset: 0,
  className: 'z-50',
} as const;

export function SelectContent(props: {
  options: readonly FieldPickerOption[];
}): React.JSX.Element {
  return (
    <RadixSelect.Portal>
      <TextClassContext.Provider value="text-foreground">
        <RadixSelect.Content {...popper}>
          <Rows options={props.options} />
        </RadixSelect.Content>
      </TextClassContext.Provider>
    </RadixSelect.Portal>
  );
}

const Rows = (props: {
  options: readonly FieldPickerOption[];
}): React.JSX.Element => (
  <View className={contentClassName}>
    <RadixSelect.Viewport className={viewportClassName}>
      {props.options.map(selectItem)}
    </RadixSelect.Viewport>
  </View>
);

const contentClassName = cn(
  menuSurfaceClassName,
  'relative z-50 min-w-32 shadow-raised web:shadow-card web:translate-y-1',
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:slide-in-from-top-2 web:origin-(--radix-select-content-transform-origin) web:max-h-52 web:overflow-y-auto web:overflow-x-hidden',
);

const viewportClassName = cn(
  'flex flex-col w-full web:h-(--radix-select-trigger-height) web:min-w-(--radix-select-trigger-width)',
  menuRowsClassName,
  menuInsetClassName,
);
