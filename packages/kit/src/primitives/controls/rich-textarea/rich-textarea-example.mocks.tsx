import type * as React from 'react';
import { useState } from 'react';
import { RichTextarea } from './rich-textarea';
import type { ReferenceOption } from './rich-textarea-references';
import type {
  ComposerSuggestion,
  SuggestionResource,
  SuggestionSource,
} from './rich-textarea-suggestions';

interface ExampleProps {
  initialValue?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  references?: readonly ReferenceOption[];
  suggestions?: readonly SuggestionSource[];
  onResourcesChange?: (resources: readonly SuggestionResource[]) => void;
}

export const exampleLabel = 'Message';

export const examplePlaceholder = 'Message the Agent…';

// Lexical binds its shortcuts to ⌘ on Apple platforms and Ctrl elsewhere.
export const shortcutModifier = /Mac|iPhone|iPad/.test(navigator.platform)
  ? 'Meta'
  : 'Control';

type ExampleValue = {
  controlled: { value: string; onChangeText: (changed: string) => void };
  setValue: (value: string) => void;
};

// The draft a controlled RichTextarea keeps, with a setter for values that arrive from outside.
export function useExampleValue(
  initialValue: string,
  onChangeText?: (value: string) => void,
): ExampleValue {
  const [value, setValue] = useState(initialValue);

  const changeText = (changed: string): void => {
    setValue(changed);
    onChangeText?.(changed);
  };

  return { controlled: { value, onChangeText: changeText }, setValue };
}

// A stateful controlled wrapper: a RichTextarea that keeps its own value, as the Composer's draft does.
export function RichTextareaExample({
  initialValue = '',
  onChangeText,
  ...props
}: ExampleProps): React.JSX.Element {
  const { controlled } = useExampleValue(initialValue, onChangeText);

  return (
    <RichTextarea
      accessibilityLabel={exampleLabel}
      placeholder={examplePlaceholder}
      {...controlled}
      {...props}
    />
  );
}

interface LateSource {
  source: SuggestionSource;
  // Settles the promise the source gave for this query.
  answer: (query: string, results: readonly ComposerSuggestion[]) => void;
}

/*
 * A source that answers with a promise the story settles by hand, so a play decides when each
 * answer arrives and in what order. Make one per story, so no answer outlives it.
 */
export function lateSource(title: string): LateSource {
  const settlers = new Map<
    string,
    (results: readonly ComposerSuggestion[]) => void
  >();

  return {
    source: {
      id: title,
      title,
      query: (query) =>
        new Promise((settle) => {
          settlers.set(query, settle);
        }),
    },
    answer: (query, results) => settlers.get(query)?.(results),
  };
}
