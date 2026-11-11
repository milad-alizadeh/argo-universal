import { z } from 'zod';
import { sessionColumns } from '../columns';
import { pluginBlueprint } from '../plugins/plugin-blueprint';
import {
  componentNames,
  kitIndex,
  kitReference,
} from '../plugins/plugin-guide-reference';
import { maxPluginIdLength } from '../plugins/plugin-identifier';

// What `plugin.guide` asks: nothing for the blueprint and the index of kit components, or the components whose props to read.
export const PluginGuideInput = z
  .strictObject({
    components: z
      .array(z.string())
      .optional()
      .describe(
        'Kit component names, such as ["Screen", "List"]; answers their props instead of the blueprint.',
      ),
  })
  .default({});

export type PluginGuideInput = z.infer<typeof PluginGuideInput>;

// Markdown, one line to an element so a terminal or an Agent reads it as lines: the blueprint and an index of kit components, or the props of those asked for.
export const PluginGuide = z.strictObject({ guide: z.array(z.string()) });

export type PluginGuide = z.infer<typeof PluginGuide>;

const lines = (text: string): string[] => text.split('\n');

const unknownComponents = (asked: string[]): string[] =>
  asked.filter((name) => !componentNames().some((known) => known === name));

export function pluginGuide({ components }: PluginGuideInput): PluginGuide {
  if (components === undefined)
    return { guide: lines(`${pluginBlueprint}\n${kitIndex()}`) };

  const unknown = unknownComponents(components);

  if (unknown.length > 0)
    throw new Error(
      `No kit component named ${unknown.join(', ')}. Run plugin.guide with no components for the names.`,
    );

  return {
    guide: lines(
      kitReference(componentNames().filter((n) => components.includes(n))),
    ),
  };
}

const idFix =
  'A Plugin id is lower-case letters, digits and dashes, and starts with a letter, such as notes-board';

// Input of `plugin.new`: the Plugin's id and name, and the Session whose Checkout holds it.
export const PluginNewInput = z.strictObject({
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, idFix)
    .max(maxPluginIdLength),
  name: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('The name people see; the id spelled as words when left out.'),
  sessionId: sessionColumns.shape.id
    .optional()
    .describe(
      'The Session whose Checkout gets the Plugin; the calling Session when left out.',
    ),
});

export type PluginNewInput = z.infer<typeof PluginNewInput>;

// Where the Plugin went, relative to the Checkout, and what to run next.
export const PluginNewOutput = z.strictObject({
  path: z.string(),
  directory: z
    .string()
    .describe('The absolute folder, for a caller that is not in the Checkout.'),
  files: z.array(z.string()),
  next: z.array(z.string()),
});

export type PluginNewOutput = z.infer<typeof PluginNewOutput>;
