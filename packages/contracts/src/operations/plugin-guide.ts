import { z } from 'zod';
import { sessionColumns } from '../columns';
import { pluginBlueprint } from '../plugins/plugin-blueprint';
import { kitReference } from '../plugins/plugin-guide-reference';
import { maxPluginIdLength } from '../plugins/plugin-identifier';

// What `plugin.guide` answers: the blueprint, then every kit component with its props, as one Markdown text.
export const PluginGuide = z.strictObject({ guide: z.string() });

export type PluginGuide = z.infer<typeof PluginGuide>;

export const pluginGuide = (): PluginGuide => ({
  guide: `${pluginBlueprint}\n${kitReference()}`,
});

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
