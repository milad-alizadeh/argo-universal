import type * as React from 'react';
import { type ComponentType, type ReactElement, useState } from 'react';
import { Platform } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { BottomSheet } from '#primitives/overlays/bottom-sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import { useWide } from '../../../use-wide/use-wide';
import { ComboboxContent } from './combobox-content';
import type { ComboboxProps } from './picker-props';
import { choosePickerOption, pickerValue } from './picker-selection';

/*
 * A Picker with search: its trigger opens the search over the options in a popover on a wide
 * window and in a sheet on a phone. Choosing an option commits it and closes.
 */
export function Combobox<Value extends string>(
  props: ComboboxProps<Value>,
): React.JSX.Element {
  const Overlay = useWide() ? WideCombobox : SheetCombobox;

  return (
    <Overlay {...props} trigger={props.trigger ?? defaultTrigger(props)} />
  );
}

type Trigger = ReactElement<{ disabled?: boolean | null }>;

type OverlayProps<Value extends string> = ComboboxProps<Value> & {
  trigger: Trigger;
};

function defaultTrigger<Value extends string>(
  props: ComboboxProps<Value>,
): Trigger {
  const value = pickerValue(props);

  return (
    <Button
      variant="outline"
      label={value}
      accessibilityLabel={`${props.label}: ${value}`}
      disabled={props.disabled}
    />
  );
}

const popoverPresentation = {
  side: 'bottom',
  align: 'start',
  className: 'w-80 rounded-surface border-0 bg-content p-0 shadow-card',
} as const;

function WideCombobox<Value extends string>(
  props: OverlayProps<Value>,
): React.JSX.Element {
  return (
    <Popover onOpenChange={(open) => !open && props.onBlur?.()}>
      <PopoverTrigger asChild disabled={!!props.trigger.props.disabled}>
        {props.trigger}
      </PopoverTrigger>
      <PopoverContent {...popoverPresentation} accessibilityLabel={props.label}>
        <WideContent {...props} />
      </PopoverContent>
    </Popover>
  );
}

function WideContent<Value extends string>(
  props: OverlayProps<Value>,
): React.JSX.Element {
  const close = usePopoverClose();

  return (
    <ComboboxContent
      {...props}
      wide
      onChoose={(value) => {
        close();
        choosePickerOption(props, value);
      }}
    />
  );
}

// Android's sheet hugs its options; iOS rises to their height through its detents.
const hugsOptions = Platform.OS === 'android';

const sheetContent = { wide: false, fit: hugsOptions } as const;

// The stock grouped sheet, as tall as its options.
const sheetPresentation = {
  surface: 'grouped',
  fit: hugsOptions,
  contentScrolls: true,
  fitList: true,
  expandable: true,
} as const;

function SheetCombobox<Value extends string>(
  props: OverlayProps<Value>,
): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const choose = (value: Value): void => {
    setOpen(false);
    choosePickerOption(props, value);
  };

  return (
    <BottomSheet {...sheetProps(props, open, setOpen)}>
      <ComboboxContent {...props} {...sheetContent} onChoose={choose} />
    </BottomSheet>
  );
}

function sheetProps<Value extends string>(
  props: OverlayProps<Value>,
  open: boolean,
  setOpen: (open: boolean) => void,
): Omit<React.ComponentProps<typeof BottomSheet>, 'children'> {
  return {
    ...sheetPresentation,
    open,
    onOpenChange: setOpen,
    onClosed: props.onBlur,
    trigger: props.trigger,
    label: props.label,
  };
}

Combobox satisfies ComponentType<ComboboxProps<string>>;
