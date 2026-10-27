import type { z } from 'zod';
import type { KitComponentDefinition } from '../src/plugins/kit-component-definition';
import { propsSchema } from './plugin-reference-format';
import { resolvedReference } from './plugin-reference-inference';

type JsonSchema = z.core.JSONSchema.JSONSchema;

type Properties = NonNullable<JsonSchema['properties']>;

function requiredName(required: ReadonlySet<string>): string | undefined {
  const property = ['accessibilityLabel', 'label', 'title'].find((name) =>
    required.has(name),
  );

  return property ? `the required \`${property}\` prop` : undefined;
}

function optionalName(properties: Properties): string | undefined {
  return 'accessibilityLabel' in properties
    ? '`accessibilityLabel` when supplied'
    : undefined;
}

function trimFinalPunctuation(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

function chooseName(
  required: string | undefined,
  optional: string | undefined,
  fallback: string,
): string {
  if (required) return required;

  if (optional) return optional;

  return fallback;
}

function accessibleName(
  name: string,
  component: KitComponentDefinition,
): string {
  const schema = propsSchema(name);
  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};

  return chooseName(
    requiredName(required),
    optionalName(properties),
    trimFinalPunctuation(resolvedReference(component).accessibility.label),
  );
}

export function accessibilitySection(
  name: string,
  component: KitComponentDefinition,
): string {
  const { accessibility } = resolvedReference(component);

  return [
    `- **Accessible name:** ${accessibleName(name, component)}.`,
    `- **Keyboard:** ${accessibility.keyboard}`,
    `- **VoiceOver:** ${accessibility.voiceOver}`,
    `- **TalkBack:** ${accessibility.talkBack}`,
  ].join('\n');
}
