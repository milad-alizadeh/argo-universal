import { Switch as UniversalSwitch } from '@expo/ui';
import type { ReactElement } from 'react';
import type { SwitchProps } from './switch-props';

/*
 * Expo UI's universal Switch, with no row around it: on the web it is a checkbox in a label whose hidden text names
 * it, since Expo's web Switch takes no accessibility props and draws only a visible label of its own.
 */
export type { SwitchProps } from './switch-props';

export function Switch(props: SwitchProps): ReactElement {
  return (
    /* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- Expo's Switch draws the checkbox input inside it. */
    <label className="inline-flex">
      <span className="sr-only">{props.accessibilityLabel}</span>
      <UniversalSwitch
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
      />
    </label>
  );
}
