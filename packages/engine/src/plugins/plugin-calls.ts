import { CapabilityRefusal } from './capability-refusal';
import type { PluginAccess } from './plugin-access';
import { parsedUrl, type PluginNetwork } from './plugin-fetch';
import type { CheckedProcessCall } from './plugin-processes';
import type { PluginResources } from './plugin-resources';
import {
  runtimeError,
  type FetchCall,
  type FsCall,
  type PluginRequest,
  type PluginValue,
  type ProcessCall,
} from './runtime-protocol';

// Pages are the runtime's own; every other call is answered by PluginServices.
export type StateRequest = Exclude<PluginRequest, { api: 'view' }>;

export type MachineRequest = Extract<
  StateRequest,
  { api: 'fs' | 'process' | 'fetch' }
>;

// What one checked call runs against, and `allowed`, which logs it once the checker lets it through.
export type MachineContext = {
  access: PluginAccess;
  resources: PluginResources;
  network: PluginNetwork;
  allowed: () => void;
};

// The checker decides before the call runs, so a refused call never reaches the machine.
export async function machineCall(
  context: MachineContext,
  request: MachineRequest,
): Promise<PluginValue> {
  if (request.api === 'fs') return fsRequest(context, request.call);

  if (request.api === 'process') return processRequest(context, request.call);

  return fetchRequest(context, request.call);
}

async function fsRequest(
  { access, resources, allowed }: MachineContext,
  call: FsCall,
): Promise<PluginValue> {
  await access.path(call.path, call.action === 'write' ? 'write' : 'read');
  allowed();

  return resources.fs(access, call);
}

async function processRequest(
  { access, resources, allowed }: MachineContext,
  call: ProcessCall,
): Promise<PluginValue> {
  const checked = await checkedProcess(access, call);

  allowed();

  return resources.process(checked);
}

async function fetchRequest(
  { access, resources, network, allowed }: MachineContext,
  call: FetchCall,
): Promise<PluginValue> {
  access.host(parsedUrl(call.url));
  allowed();

  return resources.fetch(call, { access, network });
}

// When ADR-0027's `process.spawn` Hooks land (#821), they run before this, so the check sees the final argv.
async function checkedProcess(
  access: PluginAccess,
  call: ProcessCall,
): Promise<CheckedProcessCall> {
  if (call.action === 'wait' || call.action === 'kill') return call;

  return { ...(await access.command(call)), action: call.action };
}

// A refusal is one line naming the Plugin and the call; any other failure keeps its own line.
export function failureLine(
  pluginId: string,
  request: StateRequest,
  cause: unknown,
): string {
  if (cause instanceof CapabilityRefusal)
    return `Plugin ${pluginId}: refused ${describeCall(request)}: ${cause.message}`;

  return `Plugin ${pluginId}: argo call failed: ${runtimeError(cause)}`;
}

export const replyError = (cause: unknown): string =>
  cause instanceof CapabilityRefusal
    ? `Refused: ${cause.message}`
    : runtimeError(cause);

// The log names the call and where it points, never a secret value or a file's content.
export function describeCall(request: StateRequest): string {
  if (request.api === 'storage')
    return `argo.storage ${request.queries.length}`;

  if (request.api === 'secrets')
    return `argo.secrets.${request.call.action} ${request.call.account}`;

  return describeMachineCall(request);
}

function describeMachineCall(request: MachineRequest): string {
  if (request.api === 'fs')
    return `argo.fs.${request.call.action} ${request.call.path}`;

  if (request.api === 'process')
    return `argo.process.${request.call.action} ${describeProcess(request.call)}`;

  return describeFetch(request.call);
}

const describeFetch = ({ method = 'GET', url }: FetchCall): string =>
  `argo.fetch ${method} ${url}`;

const describeProcess = (call: ProcessCall): string =>
  'argv' in call ? call.argv.join(' ') : call.id;
