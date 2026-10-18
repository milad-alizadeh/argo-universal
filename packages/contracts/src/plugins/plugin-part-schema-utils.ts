import { z } from 'zod';
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

const defaultLabel =
  'Use the part’s required label prop as its accessible name.';

const defaultAppearance =
  'Uses Argo semantic tokens, which adapt to light and dark appearance. No arbitrary color or Image prop is declared unless listed below.';

function accessibility(label: string): WirePartReference['accessibility'] {
  return {
    label,
    keyboard:
      'Interactive controls follow platform focus order and activate with the platform’s standard keys. Non-interactive parts add no focus stop.',
    voiceOver:
      'VoiceOver reads the accessible name and the control role and state supplied by the part.',
    talkBack:
      'TalkBack reads the accessible name and the control role and state supplied by the part.',
  };
}

function reference(
  summary: string,
  label: string,
  appearance: string,
): WirePartReference {
  return { summary, accessibility: accessibility(label), appearance };
}

interface PartOptions {
  slots?: Record<string, readonly string[]>;
  events?: Record<string, z.ZodType>;
  children?: boolean;
  container?: boolean;
  label?: string;
  appearance?: string;
}

const defaultOptions = {
  slots: noSlots,
  events: noEvents,
  children: false,
  label: defaultLabel,
  appearance: defaultAppearance,
} satisfies Required<Omit<PartOptions, 'container'>>;

type ResolvedPartOptions = Required<Omit<PartOptions, 'container'>> & {
  container: boolean;
};

function resolveOptions(options: PartOptions): ResolvedPartOptions {
  const config = Object.assign({}, defaultOptions, options);

  const inferredContainer =
    config.children || Object.keys(config.slots).length > 0;

  return {
    ...config,
    container: options.container ?? inferredContainer,
  };
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
    reference: reference(summary, config.label, config.appearance),
  };
}

export function part(
  summary: string,
  schema: z.ZodObject = z.object({}),
  options: PartOptions = {},
): WirePartDefinition {
  return definition(summary, schema, resolveOptions(options));
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
