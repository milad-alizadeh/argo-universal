import type { OperationRow } from '@repo/contracts/operations';
import type { PluginList } from '@repo/contracts/plugins';
import {
  pluginOperationId,
  type PluginOperationContribution,
  type PluginOperationParam,
} from '@repo/contracts/plugins/plugin-operations';
import { runParams } from './checked-run';

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
  params: paramsSchema(runParams(declared.operation)),
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
    Object.entries(params).map(([name, { type, description, choices }]) => [
      name,
      { type, description, ...(choices && { enum: choices }) },
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
