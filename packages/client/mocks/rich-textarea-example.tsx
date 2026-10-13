import type * as React from 'react';
import { useState } from 'react';
import { RichTextarea } from '../src/lib/generic/primitives/inputs/rich-textarea/rich-textarea';

interface ExampleProps {
  initialValue?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
}

export const exampleLabel = 'Message';

// Lexical binds its shortcuts to ⌘ on Apple platforms and Ctrl elsewhere.
export const shortcutModifier = /Mac|iPhone|iPad/.test(navigator.platform)
  ? 'Meta'
  : 'Control';

type ExampleValue = { value: string; onChangeText: (changed: string) => void };

function useExampleValue(
  initialValue: string,
  onChangeText?: (value: string) => void,
): ExampleValue {
  const [value, setValue] = useState(initialValue);

  return {
    value,
    onChangeText: (changed: string): void => {
      setValue(changed);
      onChangeText?.(changed);
    },
  };
}

// A stateful controlled wrapper: a RichTextarea that keeps its own value, as the Composer's draft does.
export function RichTextareaExample({
  initialValue = '',
  onChangeText,
  onSubmit,
}: ExampleProps): React.JSX.Element {
  const controlled = useExampleValue(initialValue, onChangeText);

  return (
    <RichTextarea
      accessibilityLabel={exampleLabel}
      placeholder="Message the Agent…"
      {...controlled}
      onSubmit={onSubmit}
    />
  );
}

/*
 * The text a RichTextarea shows, line breaks included. On the web, Lexical holds an empty line open
 * with a <br>, which innerText reads as one trailing newline.
 */
export function shownText(field: HTMLElement): string {
  return field.innerText.replace(/\n$/, '');
}
