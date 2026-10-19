import { createElement, type ReactElement, type KeyboardEvent } from 'react';
import type { FormSurfaceProps } from './form-surface-props';

const shortcutKey = (event: KeyboardEvent): boolean =>
  event.key === 'Enter' && (event.metaKey || event.ctrlKey);

function onKey(event: KeyboardEvent, onShortcut: () => void): void {
  if (!shortcutKey(event)) return;

  event.preventDefault();
  onShortcut();
}

// ⌘↵ (Ctrl+Enter) submits from any field; while the Form submits its fields are inert and muted.
export function FormFields(props: FormSurfaceProps): ReactElement {
  return createElement(
    'div',
    {
      inert: props.locked,
      'aria-busy': props.locked,
      className: props.locked
        ? 'flex flex-col gap-6 opacity-50'
        : 'flex flex-col gap-6',
      onKeyDownCapture: (event: KeyboardEvent) =>
        onKey(event, props.onShortcut),
    },
    props.children,
  );
}
