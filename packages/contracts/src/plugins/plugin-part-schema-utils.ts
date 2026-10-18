import { z } from 'zod';
import { partAccessibility } from './plugin-part-accessibility';
import type {
  PartDefinition,
  PartOptions,
  ResolvedPartOptions,
} from './plugin-part-options';
import { schemaProperties } from './schema-properties';
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
  schema: z.ZodType;
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

const defaultOptions = {
  slots: noSlots,
  events: noEvents,
  children: false,
  label: '',
  appearance: defaultAppearance,
  accessibility: {},
  previous: [],
} satisfies Required<Omit<PartOptions, 'container'>>;

function resolveOptions(
  schema: z.ZodType,
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
  return Boolean(config.children) || Object.keys(config.slots).length > 0;
}

function inferredEvents(schema: z.ZodType): Record<string, z.ZodType> {
  return Object.fromEntries(
    Object.keys(schemaProperties(schema))
      .filter((name) => name.startsWith('on'))
      .map((name) => [name, z.undefined()]),
  );
}

function describeField(name: string, field: z.core.$ZodType): void {
  const metadata = z.globalRegistry.get(field);

  if (metadata?.description) return;

  z.globalRegistry.add(field, {
    ...metadata,
    description: `${name.replaceAll(/([a-z])([A-Z])/g, '$1 $2')} for this part.`,
  });
}

function describeFields(fields: z.ZodObject['shape']): void {
  for (const [name, field] of Object.entries(fields))
    describeField(name, field);
}

function describeProps(schema: z.core.$ZodType): void {
  if (schema instanceof z.ZodUnion) {
    for (const option of schema.options) describeProps(option);

    return;
  }

  describeFields(schemaProperties(schema));
}

function definition(
  summary: string,
  schema: z.ZodType,
  config: ReturnType<typeof resolveOptions>,
): WirePartDefinition {
  return {
    props: schema,
    versions: [...config.previous, schema],
    container: config.container,
    children: config.children,
    slots: config.slots,
    events: config.events,
    reference: partReference({ summary, schema, config }),
  };
}

export function part<
  Schema extends z.ZodType,
  const Options extends PartOptions = Record<never, never>,
>(
  summary: string,
  schema: Schema,
  options?: Options,
): PartDefinition<Schema, Options>;
export function part(
  summary: string,
  schema: z.ZodType = z.object({}),
  options: PartOptions = {},
): WirePartDefinition {
  describeProps(schema);

  const config = resolveOptions(schema, options);

  return definition(summary, schema, config);
}

export {
  stringLabel,
  optionalLabel,
  tone,
  handler,
  onPress,
  imageSource,
} from './plugin-part-props';
