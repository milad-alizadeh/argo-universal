import {
  createElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { moveFocusAmong } from '#lib/generic/arrow-focus';
import { ComboboxChoices } from './combobox-choices';
import type { ComboboxContentProps } from './combobox-props';

export type ResultsProps<Value extends string> = ComboboxContentProps<Value> & {
  search: ReactNode;
  message: ReactNode;
  footer: ReactNode;
};

export function ComboboxResults<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return createElement(
    'div',
    {
      role: 'group',
      onKeyDownCapture: moveFocus,
      className: 'flex min-h-0 flex-col wide:gap-1 wide:p-1',
    },
    props.search,
    <Options {...props} />,
    props.footer,
  );
}

function Options<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return <ComboboxChoices {...props} />;
}

// The choices are radio buttons; a disabled one is passed over.
function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const choices = [...event.currentTarget.querySelectorAll('button')].filter(
    (choice) => choice.role === 'radio' && !choice.disabled,
  );

  moveFocusAmong(event, choices);
}
