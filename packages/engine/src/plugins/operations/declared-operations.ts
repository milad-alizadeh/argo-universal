import type { OperationRow } from '@repo/contracts/operations';
import type { PluginList } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  pluginOperationId,
  type PluginOperationContribution,
  type PluginOperationParam,
} from '@repo/contracts/plugins/plugin-operations';
import { z } from 'zod';

// A declared Operation with the Plugin that answers it.
export type DeclaredOperation = {
  pluginId: string;
  pluginName: string;
  enabled: boolean;
  operation: PluginOperationContribution;
};

// Every enabled Plugin's declared Operations, whether or not its worker is running yet.
export function declaredOperations(list: PluginList): DeclaredOperation[] {
  return list.plugins.flatMap(({ manifest, enabled }) =>
    (manifest.contributes.operations ?? []).map((operation) => ({
      pluginId: manifest.id,
      pluginName: manifest.name,
      enabled,
      operation,
    })),
  );
}

export const operationRow = (declared: DeclaredOperation): OperationRow => ({
  ...operationIdentity(declared),
  params: paramsSchema(declared.operation.params),
  result: { description: `What ${declared.pluginName} answers.` },
  tier: declared.operation.tier,
  keywords: operationKeywords(declared),
  enabled: declared.enabled,
  disabledReason: disabledReason(declared),
});

const operationIdentity = ({
  pluginId,
  operation,
}: DeclaredOperation): Pick<OperationRow, 'id' | 'label' | 'description'> => ({
  id: pluginOperationId(pluginId, operation.name),
  label: operation.label,
  description: operation.description,
});

// A Plugin's own keywords, or its name, so a search for the Plugin finds what it adds.
const operationKeywords = ({
  pluginName,
  operation,
}: DeclaredOperation): readonly string[] =>
  operation.keywords ?? [pluginName.toLowerCase()];

const disabledReason = ({
  enabled,
  pluginName,
}: DeclaredOperation): string | null =>
  enabled ? null : `${pluginName} is turned off`;

type Params = Readonly<Record<string, PluginOperationParam>>;

const requiredNames = (params: Params): string[] =>
  Object.entries(params)
    .filter(([, param]) => param.required)
    .map(([name]) => name);

const paramProperties = (params: Params): OperationRow['params'] =>
  Object.fromEntries(
    Object.entries(params).map(([name, { type, description }]) => [
      name,
      { type, description },
    ]),
  );

// The declared params as the JSON Schema `argo operations` prints and `argo run` is checked against.
function paramsSchema(params: Params = {}): OperationRow['params'] {
  const schema: OperationRow['params'] = {
    type: 'object',
    additionalProperties: false,
    properties: paramProperties(params),
  };

  const required = requiredNames(params);

  if (required.length > 0) schema.required = required;

  return schema;
}

export type ParamValue = string | number | boolean;

export type CheckedParams = Readonly<Record<string, ParamValue>>;

// Params arrive as JSON from the CLI or the App, so their shape is parsed before it is read.
const GivenParams = z.record(z.string(), z.json()).nullish();

const givenParams = (given: Json): Record<string, Json> => {
  const parsed = GivenParams.safeParse(given);

  if (!parsed.success) throw new Error('Params must be a JSON object');

  return parsed.data ?? {};
};

/*
 * The params core passes a Plugin: exactly the ones it declared, each of the declared type, with every
 * required one given. A Plugin never sees a param it did not ask for.
 */
export function checkParams(params: Params, given: Json): CheckedParams {
  const values = givenParams(given);

  for (const name of Object.keys(values))
    if (!Object.hasOwn(params, name)) throw new Error(`Unknown param ${name}`);

  return Object.fromEntries(
    Object.entries(params).flatMap(([name, param]) =>
      checkedParam(name, param, values[name]),
    ),
  );
}

function checkedParam(
  name: string,
  param: PluginOperationParam,
  value: Json | undefined,
): [string, ParamValue][] {
  if (value === undefined || value === null) return missingParam(name, param);

  return [[name, checkedValue(name, param, value)]];
}

const missingParam = (
  name: string,
  param: PluginOperationParam,
): [string, ParamValue][] => {
  if (param.required) throw new Error(`Param ${name} is required`);

  return [];
};

const paramSchemas = {
  string: z.string(),
  number: z.number(),
  boolean: z.boolean(),
} as const;

const checkedValue = (
  name: string,
  param: PluginOperationParam,
  value: Json,
): ParamValue => {
  const parsed = paramSchemas[param.type].safeParse(value);

  if (!parsed.success) throw new Error(`Param ${name} must be a ${param.type}`);

  return parsed.data;
};
