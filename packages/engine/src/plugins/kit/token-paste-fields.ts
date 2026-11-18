import { PluginOperationName } from '@repo/contracts/plugins/plugin-operations';
import type {
  TokenPasteField,
  TokenPasteFields,
} from '@repo/contracts/plugins/token-paste-api';

export function checkedFields(
  fields: readonly TokenPasteField[],
): readonly TokenPasteField[] {
  const keys = fields.map(({ key }) => key);

  if (new Set(keys).size !== keys.length || keys.some(invalidField))
    throw new Error(
      'Token paste fields need unique Operation param names other than token and flow',
    );

  return fields;
}

const reserved = new Set(['token', 'flow']);

const invalidField = (key: string): boolean =>
  reserved.has(key) || !PluginOperationName.safeParse(key).success;

export type Input = { token: string; fields: TokenPasteFields };

export function inputOf(
  fields: readonly TokenPasteField[],
  token: string,
  values: TokenPasteFields,
): Input {
  return {
    token: token.trim(),
    fields: Object.fromEntries(
      fields.map(({ key }) => [key, values[key] ?? '']),
    ),
  };
}
