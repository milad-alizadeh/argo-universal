import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import { createContext, useContext } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { type OpenState, useOpenState } from '#primitives/overlays/open-state';

/*
 * Picker's web drawing, on Radix Select (`@radix-ui/react-select`): Root `value`/`onValueChange`/`open`/
 * `onOpenChange`/`disabled`, Trigger `asChild`, Value `placeholder`, Item `value`/`textValue`/`disabled`,
 * ItemText and ItemIndicator. Phones draw Picker's native files instead (ADR-0020).
 */
type SelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

type SelectState = OpenState & { chosen: boolean };

const SelectContext = createContext<SelectState>({
  open: false,
  chosen: false,
  onOpenChange: () => {},
});

// The trigger opens the select on a press, which Radix's own click cannot see.
export function useSelectState(): SelectState {
  return useContext(SelectContext);
}

export function Select(props: SelectProps): React.JSX.Element {
  const state = useOpenState({ onOpenChange: props.onOpenChange });

  return (
    <SelectContext value={{ ...state, chosen: props.value !== undefined }}>
      <RadixSelect.Root {...state} {...rootProps(props)}>
        <View>{props.children}</View>
      </RadixSelect.Root>
    </SelectContext>
  );
}

function rootProps(
  props: SelectProps,
): Pick<SelectProps, 'value' | 'onValueChange' | 'disabled'> {
  return {
    value: props.value,
    onValueChange: props.onValueChange,
    disabled: props.disabled,
  };
}

type ValueProps = { className?: string; placeholder?: string };

const valueClassName =
  'type-body line-clamp-1 flex flex-row items-center gap-2';

// The chosen option's label, or the muted placeholder.
export function SelectValue(props: ValueProps): React.JSX.Element {
  const { chosen } = useSelectState();
  const muted = !chosen && 'text-muted-foreground';

  return (
    <RadixSelect.Value
      placeholder={props.placeholder}
      className={cn(valueClassName, muted, props.className)}
    />
  );
}
