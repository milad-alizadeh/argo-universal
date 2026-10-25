import { useState, type ReactElement } from 'react';
import { Drill, type DrillProps } from '#primitives/overlays/drill';
import { choiceSummary, type PickerProps } from './field-picker-model';
import { FieldPickerScreen } from './field-picker-screen';

export type ScreenTrigger = NonNullable<DrillProps['trigger']>;

type DrillPickerProps = PickerProps & {
  opener: ScreenTrigger;
  // The row sits in a popover: its choices open beside it, on its right.
  beside?: boolean;
};

/*
 * A picker's `page` presentation: its row's trigger opens the choices where the platform puts a drill. A desktop
 * window opens a popover beside the row, and anywhere else the page is pushed on the stack that holds the row: the
 * enclosing Sheet's, or the screen's own with its native header, Back and search (never a Sheet of its own). A
 * `multiple` choice leaves the popover open for the next pick.
 */
export function FieldPickerDrill(props: DrillPickerProps): ReactElement {
  const [query, setQuery] = useState('');
  const typed = { query, onQueryChange: setQuery };

  return (
    <Drill
      {...drillProps(props)}
      search={searchOf(props, typed)}
      onClose={() => setQuery('')}
    >
      {screenOf(props, typed)}
    </Drill>
  );
}

const screenOf =
  (props: DrillPickerProps, typed: Typed): DrillProps['children'] =>
  (close, inHeader) => (
    <FieldPickerScreen
      {...props}
      {...typed}
      searchInHeader={inHeader}
      onClose={close}
    />
  );

const drillProps = (
  props: DrillPickerProps,
): Omit<DrillProps, 'children' | 'search' | 'onClose'> => ({
  label: props.title,
  title: props.title,
  value: choiceSummary(props),
  trigger: props.opener,
  disabled: props.disabled,
  contentScrolls: true,
  keepOpen: props.multiple,
  beside: props.beside,
  action: props.footerAction,
});

type Typed = { query: string; onQueryChange: (query: string) => void };

function searchOf(props: DrillPickerProps, typed: Typed): DrillProps['search'] {
  return props.searchable
    ? {
        label: `Search ${props.title}`,
        value: typed.query,
        onChangeText: typed.onQueryChange,
      }
    : undefined;
}
