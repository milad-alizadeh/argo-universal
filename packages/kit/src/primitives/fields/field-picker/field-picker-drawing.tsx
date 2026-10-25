import type { ReactElement } from 'react';
import { useInMenu } from '#kit/menu-rows-context';
import { RowTitle } from '#primitives/fields/field-row';
import { OptionRow } from './field-picker-inline-row';
import type { PickerDrawing, PickerRowProps } from './field-picker-kind';
import type { PickerProps } from './field-picker-model';
import { ScreenTrigger } from './field-picker-screen-trigger';
import { FieldPickerSelect } from './field-picker-select';

type TriggerProps = Omit<
  React.ComponentProps<typeof ScreenTrigger>,
  'lead' | 'disclosure'
>;

/*
 * The title and the choice are one trigger, so a click anywhere on the row opens it. The row opens a page (Radix hands
 * it the anchor ref and popup state, which go on to the trigger); in a popover the page opens beside it, so the row
 * ends in the chevron of a row that opens a page.
 */
function PageRow(props: PickerRowProps & TriggerProps): ReactElement {
  const { leading, logo, ...trigger } = props;

  return (
    <ScreenTrigger
      {...trigger}
      lead={<RowTitle title={props.title} leading={leading} logo={logo} />}
      disclosure={useInMenu()}
    />
  );
}

// A `menu` of one value is the kit's borderless select; Expo UI's web Picker draws a bordered box it takes no style for.
function SelectMenu(props: PickerProps): ReactElement {
  return (
    <FieldPickerSelect
      title={props.title}
      value={props.held[0] ?? ''}
      options={props.options}
      onValueChange={props.pick}
      disabled={props.disabled}
      lead={<RowTitle title={props.title} leading={props.leading} />}
    />
  );
}

// A select cannot hold a `multiple` choice, so that opens the page's popover.
export const pickerDrawing: PickerDrawing = {
  Row: PageRow,
  Menu: SelectMenu,
  OptionRow,
  menuHoldsMultiple: false,
};
