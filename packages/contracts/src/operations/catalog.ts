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

const catalogIntroduction =
  'Run an Operation with operation_run, its id and params. `?` marks optional params. ' +
  'Omit sessionId and projectId to use your own. session.new uses your Agent and the main Checkout. ' +
  'A refusal gives the schema. Use operation_list for Plugin Operations or full schemas.';

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
