import type { z } from 'zod';
import type {
  KitComponentAccessibility,
  KitComponentDefinition,
} from '../src/plugins/kit-component-definition';
import { schemaProperties } from '../src/plugins/schema-properties';
import {
  componentKeyboardBehavior,
  componentRole,
} from './plugin-reference-keyboard';

// The reference a page prints: what the kit component declares, and what is inferred from its schema where it declares nothing.
export interface ResolvedReference {
  accessibility: KitComponentAccessibility;
  appearance: string;
}

const defaultAppearance =
  'Uses Argo semantic tokens, which adapt to light and dark appearance. No arbitrary color or Image prop is declared unless listed below.';

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
    ? `${description}; the container adds no name, and child kit components keep their own accessible names`
    : `${description}; its visible content supplies its accessible name`;
}

function componentAccessibility(
  input: AccessibilityInput,
): KitComponentAccessibility {
  const properties = schemaProperties(input.schema);

  const name = declaredName(properties, input.container);
  const role = componentRole(input.summary, properties);
  const states = stateSummary(properties);

  return {
    label: input.label || defaultLabel(input.summary, input.container),
    keyboard: componentKeyboardBehavior(input),
    voiceOver: readerBehavior({ reader: 'VoiceOver', role, name, states }),
    talkBack: readerBehavior({ reader: 'TalkBack', role, name, states }),
  };
}

const inferredAccessibility = (
  component: KitComponentDefinition,
): KitComponentAccessibility =>
  componentAccessibility({
    summary: component.reference.summary,
    schema: component.props,
    label: component.reference.label ?? '',
    container: component.container,
  });

// The reference text the docs print: what the kit component declares, over what its schema implies.
export function resolvedReference(
  component: KitComponentDefinition,
): ResolvedReference {
  const { appearance = defaultAppearance, accessibility } = component.reference;

  return {
    accessibility: { ...inferredAccessibility(component), ...accessibility },
    appearance,
  };
}
