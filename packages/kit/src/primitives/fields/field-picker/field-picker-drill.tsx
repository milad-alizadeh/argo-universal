import type { ReactElement } from 'react';
import { Drill, type DrillProps } from '#primitives/overlays/drill';
import { choiceSummary, type FieldPickerProps } from './field-picker-model';
import { FieldPickerPage } from './field-picker-page';

export type PageTrigger = NonNullable<DrillProps['trigger']>;

type DrillPickerProps = FieldPickerProps & { trigger: PageTrigger };

/*
 * A picker's `page` presentation: its row's trigger opens the choices where the platform puts a drill. A desktop
 * window opens a popover beside the row, a phone pushes a page in the enclosing Sheet, and a narrow web window
 * opens a Sheet of its own. A `multiple` choice leaves the popover open for the next pick.
 */
export function FieldPickerDrill(props: DrillPickerProps): ReactElement {
  return (
    <Drill {...drillProps(props)}>
      {(close) => <FieldPickerPage {...props} onClose={close} />}
    </Drill>
  );
}

const drillProps = (props: DrillPickerProps): Omit<DrillProps, 'children'> => ({
  label: props.title,
  title: props.title,
  value: choiceSummary(props),
  trigger: props.trigger,
  disabled: props.disabled,
  contentScrolls: true,
  keepOpen: props.multiple,
});
