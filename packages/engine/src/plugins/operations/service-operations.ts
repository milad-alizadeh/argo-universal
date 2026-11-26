import type { OperationRow } from '@repo/contracts/operations';
import type { PluginList } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  secretParamNames,
  type PluginOperationCaller,
  type PluginOperationContribution,
  type PluginOperationTier,
} from '@repo/contracts/plugins/plugin-operations';
import { appOnlyRefusal } from '../../operations/app-only';
import {
  operationPermission,
  type OperationPermission,
  requirePermissionTurn,
} from '../../operations/operation-permission';
import type { OperationCard, OperationConsent } from '../../sessions';
import { checkRun, type CheckedRun } from './checked-run';
import {
  declaredOperations,
  operationRow,
  type DeclaredOperation,
} from './declared-operations';
import type { Answer } from './plugin-operations';

/*
 * What running a Plugin's own Operation needs of the Plugin service: the declared Plugins, a worker
 * that is running, and the call itself (ADR-0044).
 */
export type OperationsPort = {
  list: () => Promise<PluginList>;
  requireRunning: (pluginId: string) => Promise<void>;
  call: (
    pluginId: string,
    request: {
      name: string;
      params: Readonly<Record<string, string | number | boolean>>;
      caller: PluginOperationCaller;
      serverDevice?: boolean;
      // The tier the Plugin's manifest declares for it.
      tier?: PluginOperationTier;
      // The secret params' values, which nothing the run writes or answers may show.
      secrets?: readonly string[];
    },
  ) => Promise<Answer>;
};

/*
 * One run of a Plugin's own Operation. `serverDevice` says the Connection that asked is the Server Device,
 * as a tap in the App there is; an Agent's `argo run` and a Hook's run leave it out.
 */
export type OperationRun = {
  pluginId: string;
  name: string;
  params: Json;
  caller: PluginOperationCaller;
  serverDevice?: boolean;
  authenticatedApp?: boolean;
  // Requests approval in the calling Session’s active Turn.
  confirm?: (card: OperationCard) => Promise<OperationConsent>;
};

// Every enabled Plugin's declared Operations, as the registry lists them.
export const declaredOperationRows = async (
  port: OperationsPort,
): Promise<OperationRow[]> =>
  declaredOperations(await port.list()).map(operationRow);

/*
 * One of a Plugin's own Operations: the params are checked against what it declared, its worker is
 * started if it is not running, and the handler's result is what the caller is answered.
 */
export async function runDeclaredOperation(
  port: OperationsPort,
  input: OperationRun,
): Promise<Json> {
  const declared = await declaredOperation(port, input);
  const checked = await checkedRun(declared, input);

  await port.requireRunning(input.pluginId);

  const answer = await port.call(input.pluginId, {
    name: input.name,
    ...checked,
    ...(input.serverDevice && { serverDevice: true }),
  });

  if (!answer.ok) throw new Error(answer.error);

  return answer.result;
}

// The values of the params the Operation marks secret, as the run was given them.
const secretValues = (
  { params }: PluginOperationContribution,
  given: CheckedRun['params'],
): string[] =>
  [...secretParamNames(params)].flatMap((name) => {
    const value = given[name];

    return typeof value === 'string' ? [value] : [];
  });

// The params and caller the handler is given, with its tier and secret values, once the policy allows it.
async function checkedRun(
  { operation }: DeclaredOperation,
  input: OperationRun,
): Promise<CheckedRun & Disclosed> {
  const checked = checkRun(operation, input.params, input.caller);

  await authorizePluginRun(input, operation, checked.params);

  return { ...checked, ...disclosed(operation, checked.params) };
}

async function authorizePluginRun(
  input: OperationRun,
  operation: PluginOperationContribution,
  params: CheckedRun['params'],
): Promise<void> {
  const permission = askedFor(
    operation,
    params,
    operationPermission(operation.policy, input.authenticatedApp === true),
  );

  if (permission === 'person-only')
    throw appOnlyRefusal(`${input.pluginId}.${input.name}`);

  if (permission === 'ask') await confirmPluginRun(input, operation);
}

// An `ask` Operation that says when it asks runs as `allow` does for any other value of that param.
function askedFor(
  { askWhen }: PluginOperationContribution,
  params: CheckedRun['params'],
  permission: OperationPermission,
): OperationPermission {
  if (permission !== 'ask' || askWhen === undefined) return permission;

  const given = params[askWhen.param];

  return typeof given === 'string' && askWhen.is.includes(given)
    ? 'ask'
    : 'allow';
}

async function confirmPluginRun(
  input: OperationRun,
  operation: PluginOperationContribution,
): Promise<void> {
  if (!input.confirm) requirePermissionTurn();

  await input.confirm({
    title: operation.label,
    description: operation.description,
  });
}

// What the run reports of its Operation: the tier it declares and the values of its secret params.
type Disclosed = { tier: PluginOperationTier; secrets: string[] };

const disclosed = (
  operation: PluginOperationContribution,
  given: CheckedRun['params'],
): Disclosed => ({
  tier: operation.tier,
  secrets: secretValues(operation, given),
});

async function declaredOperation(
  port: OperationsPort,
  { pluginId, name }: { pluginId: string; name: string },
): Promise<DeclaredOperation> {
  const found = declaredOperations(await port.list()).find(
    (declared) =>
      declared.pluginId === pluginId && declared.operation.name === name,
  );

  if (!found) throw new Error(`Unknown Operation ${pluginId}.${name}`);

  if (!found.enabled) throw new Error(`${found.pluginName} is turned off`);

  return found;
}
