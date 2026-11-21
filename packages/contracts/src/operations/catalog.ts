import type { z } from 'zod';
import { operations, type OperationDefinition } from '.';
import { operationJsonSchema } from './schema-json';

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

const sessionConfigExample = {
  configOptions: [{ configId: '<configId>', value: '<value>' }],
} satisfies Pick<
  z.input<(typeof operations)['session.new']['params']>,
  'configOptions'
>;

const catalogIntroduction =
  'Argo Operations (`?` marks optional params). Call simple Operations directly with operation_run. ' +
  'Leave out sessionId and projectId to act on your own Session and Project. ' +
  'session.new starts with your Agent on the main Checkout. Prompt: [{"type":"text","text":"…"}]. ' +
  `Configuration override: ${JSON.stringify(sessionConfigExample)}. Use IDs and values offered by the target Agent. ` +
  'Before passing unfamiliar nested params, call operation_list with {"id":"operation.id"} for its input schema. ' +
  'Use filter to find Operations by intent, including Plugin Operations.';

// Operations the catalog leaves out besides the App-only ones, such as the checklist's while the person has it off.
export type CatalogChoices = { hidden?: ReadonlySet<string> };

// The catalog an Agent runs Operations from without discovery calls: about 2,000 tokens, where every schema is about 29,000.
export const operationCatalog = ({
  hidden = new Set(),
}: CatalogChoices = {}): string =>
  [
    catalogIntroduction,
    ...Object.values(operations)
      .filter(({ id, policy }) => policy !== 'person-only' && !hidden.has(id))
      .map(catalogLine),
  ].join('\n');
