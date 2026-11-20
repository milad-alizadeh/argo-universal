import type { z } from 'zod';
import { operations, type OperationDefinition } from '.';
import { operationJsonSchema } from './schema-json';

/*
 * Operations only an App runs: the person's own Queued Prompts, and the Voice call, which carries the App's sound
 * and ends when its Connection does (ADR-0064). An Agent hangs up with `voice.hangUp`, and Agents and the CLI read
 * the Voice settings and change the voice and instructions the next call uses; turning Voice calls on or off and
 * choosing the provider stay the App's.
 */
export const appOnlyOperationIds: ReadonlySet<string> = new Set([
  'session.submit',
  'session.queue',
  'voice.status',
  'voice.start',
  'voice.end',
  'voice.setSettings',
  'voice.preview',
] satisfies (keyof typeof operations)[]);

type JsonSchema = z.core.JSONSchema.JSONSchema;

type Param = { name: string; required: boolean };

const variantsOf = (schema: JsonSchema): JsonSchema[] =>
  schema.anyOf ?? schema.oneOf ?? [schema];

const requiredIn = (variant: JsonSchema, name: string): boolean =>
  variant.required?.includes(name) ?? false;

// Each param once, in the order the schema names it; one a caller may leave out in any variant is optional.
function paramsOf(schema: JsonSchema): Param[] {
  const variants = variantsOf(schema);

  const names = [
    ...new Set(
      variants.flatMap(({ properties }) => Object.keys(properties ?? {})),
    ),
  ];

  return names.map((name) => ({
    name,
    required: variants.every((variant) => requiredIn(variant, name)),
  }));
}

// Required params first, then the optional ones marked with `?`.
const signature = (operation: OperationDefinition): string => {
  const params = paramsOf(operationJsonSchema(operation.params, 'input'));

  return [
    ...params.filter(({ required }) => required).map(({ name }) => name),
    ...params.filter(({ required }) => !required).map(({ name }) => `${name}?`),
  ].join(', ');
};

const firstSentence = (description: string): string =>
  description.split(/(?<=\.)\s/u)[0] ?? description;

const catalogLine = (operation: OperationDefinition): string =>
  `- ${operation.id}(${signature(operation)}) ${firstSentence(operation.description)}`;

const catalogIntroduction =
  'Every Argo Operation, with its params; `?` marks one you may leave out. ' +
  'Run one directly with operation_run, its id and params; do not search for it first. ' +
  'Leave out sessionId and projectId to act on your own Session and Project. ' +
  'session.new starts with your Agent on the main Checkout; give its prompt as [{"type":"text","text":"…"}]. ' +
  'A refusal gives the schema. ' +
  'Call operation_list only for a Plugin’s Operations or a whole schema.';

// Operations the catalog leaves out besides the App-only ones, such as the checklist's while the person has it off.
export type CatalogChoices = { hidden?: ReadonlySet<string> };

// The catalog an Agent runs Operations from without discovery calls: about 2,000 tokens, where every schema is about 29,000.
export const operationCatalog = ({
  hidden = new Set(),
}: CatalogChoices = {}): string =>
  [
    catalogIntroduction,
    ...Object.values(operations)
      .filter(({ id }) => !appOnlyOperationIds.has(id) && !hidden.has(id))
      .map(catalogLine),
  ].join('\n');
