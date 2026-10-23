import type { ReactElement } from 'react';
import { MenuTrigger } from '#primitives/overlays/menu';
import { FieldPickerDrill, type PageTrigger } from './field-picker-drill';
import { choiceSummary, type FieldPickerProps } from './field-picker-model';

/*
 * `trigger: 'pill'` (ADR-0042): the kit's toolbar pill, the chosen label and a down chevron, outside a FieldGroup. The
 * choices open as the picker's own page: a popover with the search field on a desktop window, a pushed page in an
 * enclosing Sheet or a Sheet of its own elsewhere.
 */
export function FieldPickerPill(props: FieldPickerProps): ReactElement {
  return <FieldPickerDrill {...props} opener={pillTrigger(props)} />;
}

function pillTrigger(props: FieldPickerProps): PageTrigger {
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
