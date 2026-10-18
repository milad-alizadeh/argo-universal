import { z } from 'zod';
import { partKeyboardBehavior, partRole } from './plugin-part-keyboard';
import { schemaProperties } from './schema-properties';
import type { WirePartReference } from './wire-part-reference';

type Accessibility = WirePartReference['accessibility'];

type Props = z.ZodObject['shape'];

interface AccessibilityInput {
  summary: string;
  schema: z.ZodType;
  label: string;
  container: boolean;
}

interface ReaderInput {
  reader: 'VoiceOver' | 'TalkBack';
  role: string;
  name: string;
  states: string;
}

function declaredName(properties: Props, container: boolean): string {
  const source = ['accessibilityLabel', 'label', 'title'].find(
    (property) => property in properties,
  );

  if (source) return `the ${source} prop`;

  return container ? 'its named child content' : 'its visible content';
}

function stateSummary(properties: Props): string {
  const states = [
    'disabled',
    'selected',
    'checked',
    'expanded',
    'value',
    'min',
    'max',
    'isLoading',
  ].filter((property) => property in properties);

  return states.length ? states.join(', ') : 'no additional state props';
}

function readerBehavior(input: ReaderInput): string {
  const navigation =
    input.reader === 'VoiceOver'
      ? 'Swipe navigation moves between this element and adjacent elements.'
      : 'Linear navigation moves between this element and adjacent elements.';

  return `${navigation} It exposes ${input.role} semantics, announces ${input.name}, and reports ${input.states}.`;
}

function defaultLabel(summary: string, container: boolean): string {
  const description = summary.endsWith('.') ? summary.slice(0, -1) : summary;

  return container
    ? `${description}; the container adds no name, and child parts keep their own accessible names`
    : `${description}; its visible content supplies its accessible name`;
}

export function partAccessibility(input: AccessibilityInput): Accessibility {
  const properties = schemaProperties(input.schema);

  const name = declaredName(properties, input.container);
  const role = partRole(input.summary, properties);
  const states = stateSummary(properties);

  return {
    label: input.label || defaultLabel(input.summary, input.container),
    keyboard: partKeyboardBehavior(input),
    voiceOver: readerBehavior({ reader: 'VoiceOver', role, name, states }),
    talkBack: readerBehavior({ reader: 'TalkBack', role, name, states }),
  };
}
