import {
  createElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
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

const directions = new Map([
  ['ArrowDown', 1],
  ['ArrowUp', -1],
  ['Home', -Infinity],
  ['End', Infinity],
]);

function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const direction = directions.get(event.key);

  if (direction === undefined) return;

  const choices = [...event.currentTarget.querySelectorAll('button')].filter(
    (choice) => choice.role === 'radio' && !choice.disabled,
  );

  const index = choices.findIndex(
    (choice) => choice === document.activeElement,
  );

  const next = Math.min(choices.length - 1, Math.max(0, index + direction));

  event.preventDefault();
  choices[next]?.focus();
}
