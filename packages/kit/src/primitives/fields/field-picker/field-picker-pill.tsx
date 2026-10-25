import type { ReactElement } from 'react';
import { MenuTrigger } from '#primitives/overlays/menu';
import { FieldPickerDrill, type ScreenTrigger } from './field-picker-drill';
import { choiceSummary, type PickerProps } from './field-picker-model';

/*
 * `trigger: 'pill'` (ADR-0042): the kit's toolbar pill, the chosen label and a down chevron, outside a FieldGroup. The
 * choices open as the picker's own page: a popover with the search field on a desktop window, a page pushed on the
 * stack that holds the pill elsewhere (the enclosing Sheet's, or the screen's own).
 */
export function FieldPickerPill(props: PickerProps): ReactElement {
  return <FieldPickerDrill {...props} opener={pillTrigger(props)} />;
}

function pillTrigger(props: PickerProps): ScreenTrigger {
  const summary = choiceSummary(props);

  return (
    <MenuTrigger
      label={summary || props.title}
      icon={props.leading}
      accessibilityLabel={`${props.title}: ${summary || 'None'}`}
      disabled={props.disabled}
    />
  );
}
