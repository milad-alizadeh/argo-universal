import type * as React from 'react';
import { useRef, useState } from 'react';
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

/*
 * A host that loses the first empty report it hears, as one does when a draft made before the
 * report landed is written over it. It holds whatever the later reports say.
 */
export function ForgetfulHostExample({
  onResourcesChange,
  ...props
}: ExampleProps): React.JSX.Element {
  const forgot = useRef(false);

  const hear = (resources: readonly SuggestionResource[]): void => {
    if (resources.length === 0 && !forgot.current) {
      forgot.current = true;

      return;
    }
    onResourcesChange?.(resources);
  };

  return <RichTextareaExample {...props} onResourcesChange={hear} />;
}

interface LateSource {
  source: SuggestionSource;
  // Settles the promise the source gave for this query, or the one it is given later; never silently dropped.
  answer: (query: string, results: readonly ComposerSuggestion[]) => void;
}

// A result of a late source, and the name its row has.
export const lateItem = (id: string): ComposerSuggestion => ({
  id,
  label: `Late ${id}`,
  insert: `${id} `,
});

export const lateName = (id: string): string => `Late ${id}`;

type Answer = PromiseWithResolvers<readonly ComposerSuggestion[]>;

/*
 * A source that answers with a promise the story settles by hand, so a play decides when each
 * answer arrives and in what order. An answer given before its query is asked waits for it.
 * Make one per story, so no answer outlives it.
 */
export function lateSource(title: string): LateSource {
  const slots = new Map<string, Answer>();

  const slot = (text: string): Answer => {
    const found = slots.get(text) ?? Promise.withResolvers();
    slots.set(text, found);

    return found;
  };

  return {
    source: { id: title, title, query: (text) => slot(text).promise },
    answer: (text, results) => slot(text).resolve(results),
  };
}

// True when `after` comes later in the document than `before`.
export const follows = (before: Element, after: Element): boolean =>
  Boolean(
    before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
