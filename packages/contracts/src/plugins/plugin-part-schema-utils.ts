import { z } from 'zod';
import { partAccessibility } from './plugin-part-accessibility';
import { Action, WireEvent } from './wire';
import type { WirePartReference } from './wire-part-reference';
import type { WirePartDefinition } from './wire-parts';

export const noSlots: Record<string, readonly string[]> = {};

export const noEvents: Record<string, z.ZodType> = {};

export const containerParts = [
  'Text',
  'Button',
  'Icon',
  'Image',
  'Pill',
  'Label',
] as const;

export const actions = ['Button', 'IconButton', 'Link', 'ActionList'] as const;

export const rows = [
  'ListItem',
  'Text',
  'Label',
  'Pill',
  'StatusDot',
  'ProgressBar',
] as const;

const defaultAppearance =
  'Uses Argo semantic tokens, which adapt to light and dark appearance. No arbitrary color or Image prop is declared unless listed below.';

interface PartReferenceInput {
  summary: string;
  schema: z.ZodObject;
  config: ResolvedPartOptions;
}

function partReference(input: PartReferenceInput): WirePartReference {
  const { summary, schema, config } = input;

  const inferred = partAccessibility({
    summary,
    schema,
    label: config.label,
    container: config.container,
  });

  return {
    summary,
    accessibility: Object.assign(inferred, config.accessibility),
    appearance: config.appearance,
  };
}

function reference(
  summary: string,
  schema: z.ZodObject,
  config: ResolvedPartOptions,
): WirePartReference {
  return partReference({ summary, schema, config });
}

interface PartOptions {
  slots?: Record<string, readonly string[]>;
  events?: Record<string, z.ZodType>;
  children?: boolean;
  container?: boolean;
  label?: string;
  appearance?: string;
  accessibility?: Partial<WirePartReference['accessibility']>;
}

const defaultOptions = {
  slots: noSlots,
  events: noEvents,
  children: false,
  label: '',
  appearance: defaultAppearance,
  accessibility: {},
} satisfies Required<Omit<PartOptions, 'container'>>;

type ResolvedPartOptions = Required<Omit<PartOptions, 'container'>> & {
  container: boolean;
};

function resolveOptions(
  schema: z.ZodObject,
  options: PartOptions,
): ResolvedPartOptions {
  const config = Object.assign({}, defaultOptions, options);

  return {
    ...config,
    container: options.container ?? inferContainer(config),
    events: Object.assign({}, inferredEvents(schema), config.events),
  };
}

function inferContainer(
  config: Pick<ResolvedPartOptions, 'children' | 'slots'>,
): boolean {
  return config.children || Object.keys(config.slots).length > 0;
}

function inferredEvents(schema: z.ZodObject): Record<string, z.ZodType> {
  return Object.fromEntries(
    Object.keys(schema.shape)
      .filter((name) => name.startsWith('on'))
      .map((name) => [name, z.undefined()]),
  );
}

function definition(
  summary: string,
  schema: z.ZodObject,
  config: ReturnType<typeof resolveOptions>,
): WirePartDefinition {
  return {
    props: schema,
    versions: [schema],
    container: config.container,
    children: config.children,
    slots: config.slots,
    events: config.events,
    reference: reference(summary, schema, config),
  };
}

export function part(
  summary: string,
  schema: z.ZodObject = z.object({}),
  options: PartOptions = {},
): WirePartDefinition {
  return definition(summary, schema, resolveOptions(schema, options));
}

export const stringLabel = z
  .string()
  .describe('The visible and accessible label.');

export const optionalLabel = stringLabel.optional();

export const tone = z
  .enum(['neutral', 'accent', 'success', 'warning', 'danger'])
  .optional()
  .describe('Argo semantic tone.');

export function handler(name: string): z.ZodType {
  return z
    .union([WireEvent.extend({ $event: z.literal(name) }), Action])
    .describe(`Action or Plugin event invoked by ${name}.`);
}

export const onPress = handler('onPress');

export const imageSource = z
  .union([z.string().url(), z.object({ asset: z.string() })])
  .describe('A remote URL or Plugin asset served through the Server.');
