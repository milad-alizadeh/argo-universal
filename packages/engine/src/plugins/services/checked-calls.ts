import type { PluginAssetSource } from '@repo/contracts/plugins/assets';
import { CapabilityRefusal } from '../access/capability-refusal';
import type { PluginAccess } from '../access/plugin-access';
import { borrowHop } from '../accounts/borrow-hop';
import { spawnHooks } from '../hooks/spawn-hooks';
import type {
  FetchCall,
  FsCall,
  PluginValue,
  ProcessCall,
} from '../protocol/runtime';
import { resolvePluginAsset } from './asset-resolver';
import type { PluginCall } from './plugin-calls';
import { firstHop } from './plugin-fetch';
import { fileAccessOf } from './plugin-file-calls';
import type { CheckedProcessCall } from './plugin-processes';

// The checker decides before each of these runs, so a refused call never reaches the machine.

export async function answerFs(
  call: PluginCall,
  request: FsCall,
): Promise<PluginValue> {
  const access = call.access();
  const path = await access.checkPath(request.path, fileAccessOf(request));

  call.logCall();

  return call.resources.fs(access, request, path);
}

export async function answerProcess(
  call: PluginCall,
  request: ProcessCall,
): Promise<PluginValue> {
  const access = call.access();

  const checked = await checkedProcess(
    access,
    await spawnHooked(call, await queryProcess(call, request)),
  );

  call.logCall();

  return call.resources.process(checked);
}

async function queryProcess(
  call: PluginCall,
  request: ProcessCall,
): Promise<ProcessCall> {
  if (!call.query || !call.projectId) return request;

  return inProject(request, await projectDirectory(call, call.projectId));
}

function projectDirectory(
  call: PluginCall,
  projectId: string,
): Promise<string | undefined> | undefined {
  return call.options.projectPath?.(projectId);
}

function inProject(request: ProcessCall, cwd: string | undefined): ProcessCall {
  if (request.action !== 'run' || request.cwd !== undefined) return request;

  return { ...request, cwd };
}

export async function answerFetch(
  call: PluginCall,
  request: FetchCall,
): Promise<PluginValue> {
  const access = call.access();

  const hop = firstHop(request);

  access.checkHost(hop.url);

  const authenticated = await fetchHop(call, hop, request.account);

  if (!authenticated) return unavailableBorrow(call);

  call.logCall();

  return call.resources.fetch(authenticated, {
    access,
    network: call.network,
  });
}

function unavailableBorrow(call: PluginCall): null {
  if (call.query) throw new CapabilityRefusal('Account is unavailable');

  return null;
}

export const answerAsset = (
  call: PluginCall,
  source: PluginAssetSource,
): Promise<PluginValue> =>
  resolvePluginAsset(source, {
    pluginId: call.pluginId,
    resources: call.resources,
    access: call.access(),
    network: call.network,
    assets: call.options.assets,
    activated: call.activated,
  });

type CommandCall = Extract<ProcessCall, { action: 'run' | 'spawn' }>;

const isCommand = (call: ProcessCall): call is CommandCall =>
  call.action === 'run' || call.action === 'spawn';

// `process.spawn` Hooks see a run or spawn first, so the checker sees the command they leave (ADR-0030).
async function spawnHooked(
  { options, pluginId, generation }: PluginCall,
  call: ProcessCall,
): Promise<ProcessCall> {
  if (!isCommand(call)) return call;
  const spawning = spawnHooks(options, { pluginId, generation });
  const answer = await spawning({ pluginId, argv: call.argv, cwd: call.cwd });

  if ('blocked' in answer)
    throw new CapabilityRefusal(
      `a process.spawn Hook blocked it: ${answer.blocked}`,
    );

  return { ...call, argv: answer.argv, cwd: answer.cwd };
}

async function checkedProcess(
  access: PluginAccess,
  call: ProcessCall,
): Promise<CheckedProcessCall> {
  if (call.action === 'wait' || call.action === 'kill') return call;

  return { ...(await access.checkCommand(call)), action: call.action };
}

function fetchHop(
  call: PluginCall,
  hop: ReturnType<typeof firstHop>,
  host?: string,
): Promise<ReturnType<typeof firstHop> | null> {
  return host === undefined ? Promise.resolve(hop) : borrowHop(call, hop, host);
}
