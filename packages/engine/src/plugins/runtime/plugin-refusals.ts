import { secretParamNames } from '@repo/contracts/plugins/plugin-operations';
import type { ActivatedPlugin } from '../access/plugin-access';
import type { Refusals } from '../pages/checked-tree';
import type { PluginLocation } from './plugin-location';

// The params each Operation marks secret, and whether the Plugin may draw a SessionRow.
export function refusalsOf(
  { operations = [] }: PluginLocation,
  { grants }: ActivatedPlugin,
): Refusals {
  const secrets = new Map(
    operations.map(({ name, params }) => [name, secretParamNames(params)]),
  );

  return {
    secretParams: (operation) => secrets.get(operation) ?? new Set(),
    readsSessions: grants.some(({ kind }) => kind === 'sessions:read'),
  };
}
