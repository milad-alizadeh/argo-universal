import type { ReactElement } from 'react';
import type { PickerProps } from '#primitives/inputs/picker';
import type { DrillProps } from '#primitives/overlays/drill';
import type { KitProps } from '../../kit-props';

export type ComboboxOption<Value extends string> = KitProps<
  'Combobox',
  Value
>['options'][number];

// Kit-only: local form validation, filtering and interactive trigger.
export type ComboboxProps<Value extends string> = KitProps<'Combobox', Value> &
  Pick<PickerProps<Value>, 'invalid' | 'onBlur'> & {
    valueLeading?: ReactElement;
    filter?: (option: ComboboxOption<Value>, query: string) => boolean;
    trigger?: ReactElement<{ disabled?: boolean; onPress?: () => void }>;
    // As Drill's: a desktop pick leaves the choices and their menu open.
    keepOpen?: boolean;
    // As Drill's: "eager" draws the choices once the sheet has opened, rather than as the page is pushed.
    mount?: DrillProps['mount'];
    // False drops the search from the choices on every platform, for a short list such as a Configure row's.
    searchable?: boolean;
  };

export type ComboboxContentProps<Value extends string> =
  ComboboxProps<Value> & { onClose?: () => void };
