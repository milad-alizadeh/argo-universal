import type { z } from 'zod';
import { partObjectSchema } from '../src/plugins/plugin-object-schema';
import { pluginPartSchemas } from '../src/plugins/plugin-part-schemas';

type JsonSchema = z.core.JSONSchema.JSONSchema;

function propertyHint(
  name: string,
  prop: string,
  schema: z.core.JSONSchema._JSONSchema,
): string {
  if (typeof schema === 'boolean')
    throw new Error(`Unsupported prop: ${name}.${prop}`);
  const description = schema.description;

  if (!description)
    throw new Error(`Missing prop description: ${name}.${prop}`);
  const property = JSON.stringify(prop);

  return `    /** ${description.replaceAll('*/', '* /')} */\n    ${property}: PropValue<${JSON.stringify(name)}, ${property}>;`;
}

function partHints(name: string, schema: JsonSchema): string {
  const hints = Object.entries(schema.properties ?? {}).map(([prop, value]) =>
    propertyHint(name, prop, value),
  );

  return `  ${JSON.stringify(name)}: {\n${hints.join('\n')}\n  };`;
}

const descriptionPreamble = `/* Generated from Contracts schema descriptions. Do not edit by hand. */
import type { z } from 'zod';
import type { pluginPartSchemas } from './plugin-part-schemas';

type PropValue<Name extends string, Prop extends PropertyKey> =
  Name extends keyof typeof pluginPartSchemas
    ? Prop extends keyof z.output<(typeof pluginPartSchemas)[Name]['props']>
      ? z.output<(typeof pluginPartSchemas)[Name]['props']>[Prop]
      : never
    : never;

`;

// Homomorphic mapped types retain these generated JSDoc hints in component editors.
export function propDescriptions(): string {
  const hints = Object.entries(pluginPartSchemas).map(([name, part]) =>
    partHints(name, partObjectSchema(part)),
  );

  return `${descriptionPreamble}
export type WireSchemaHints = {
${hints.join('\n')}
};
`;
}
