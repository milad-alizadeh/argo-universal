import type { CoreHooks } from '@repo/contracts/plugins';
import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginAccess } from '../access/plugin-access';
import {
  runtimeError,
  type FetchCall,
  type FsCall,
  type PluginRequest,
  type PluginValue,
  type ProcessCall,
} from '../protocol/runtime';
import { firstHop, type PluginNetwork } from './plugin-fetch';
import { fileAccessOf } from './plugin-file-calls';
import type { CheckedProcessCall } from './plugin-processes';
import type { PluginResources } from './plugin-resources';

// Pages and Hooks are the runtime's own; every other call is answered by PluginServices.
export type StateRequest = Exclude<
  PluginRequest,
  { api: 'view' | 'hooks' | 'dispatchResult' }
>;

export type KeptRequest = Extract<
  StateRequest,
  { api: 'storage' | 'secrets' | 'settings' | 'projects' }
>;

export type UnkeptRequest = Exclude<StateRequest, KeptRequest>;

export type MachineRequest = Extract<
  StateRequest,
  { api: 'fs' | 'process' | 'fetch' }
>;

// What one checked call runs against, and `allowed`, which logs it once the checker lets it through.
export type MachineContext = {
  pluginId: string;
  spawning: CoreHooks['process.spawn'];
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
  const path = await access.checkPath(call.path, fileAccessOf(call));

  allowed();

  return resources.fs(access, call, path);
}

async function processRequest(
  context: MachineContext,
  call: ProcessCall,
): Promise<PluginValue> {
  const checked = await checkedProcess(
    context.access,
    await spawnHooked(context, call),
  );

  context.allowed();

  return context.resources.process(checked);
}

type CommandCall = Extract<ProcessCall, { action: 'run' | 'spawn' }>;

const isCommand = (call: ProcessCall): call is CommandCall =>
  call.action === 'run' || call.action === 'spawn';

// `process.spawn` Hooks see a run or spawn first, so the checker sees the command they leave (ADR-0030).
async function spawnHooked(
  { pluginId, spawning }: MachineContext,
  call: ProcessCall,
): Promise<ProcessCall> {
  if (!isCommand(call)) return call;
  const answer = await spawning({ pluginId, argv: call.argv, cwd: call.cwd });

  if ('blocked' in answer)
    throw new CapabilityRefusal(
      `a process.spawn Hook blocked it: ${answer.blocked}`,
    );

  return { ...call, argv: answer.argv, cwd: answer.cwd };
}

async function fetchRequest(
  { access, resources, network, allowed }: MachineContext,
  call: FetchCall,
): Promise<PluginValue> {
  const hop = firstHop(call);

  access.checkHost(hop.url);
  allowed();

  return resources.fetch(hop, { access, network });
}

async function checkedProcess(
  access: PluginAccess,
  call: ProcessCall,
): Promise<CheckedProcessCall> {
  if (call.action === 'wait' || call.action === 'kill') return call;

  return { ...(await access.checkCommand(call)), action: call.action };
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

// The log names the call and where it points, never a secret value or a file's content.
export function describeCall(request: StateRequest): string {
  if (request.api === 'storage')
    return `argo.storage ${request.queries.length}`;

  return describeKeptCall(request);
}

function describeKeptCall(
  request: Exclude<StateRequest, { api: 'storage' }>,
): string {
  if (request.api === 'projects') return 'argo.projects.list';

  if (request.api === 'secrets')
    return `argo.secrets.${request.call.action} ${request.call.account}`;

  return describeOtherCall(request);
}

function describeOtherCall(
  request: Exclude<StateRequest, { api: 'storage' | 'secrets' | 'projects' }>,
): string {
  if (request.api === 'assets') return 'argo.assets.resolve';

  if (request.api === 'settings') return `argo.settings.get ${request.key}`;

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
