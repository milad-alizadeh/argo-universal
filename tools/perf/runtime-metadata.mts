import { SystemInfo, type SessionSnapshot } from '@repo/contracts';
import { operations } from '@repo/contracts/operations';
import {
  readControlToken,
  readServerAddress,
} from '@repo/engine/server-runtime';
import {
  runtimeClient,
  readRuntimeSession,
  type RuntimeClient,
} from './runtime-client.mts';
import {
  pathCondition,
  observerMetadata,
  type ObserverMetadata,
} from './runtime-environment.mts';
import type { RuntimeOptions } from './runtime-options.mts';
import type { RuntimeTarget } from './runtime-types.mts';

export async function runtimeTarget(
  options: RuntimeOptions,
): Promise<RuntimeTarget> {
  const address = readServerAddress(options.home);

  if (!address)
    throw new Error('No Server address in the explicit runtime home');

  return {
    httpUrl: `http://127.0.0.1:${address.port}`,
    token: await readControlToken(options.home),
    sessionId: options.sessionId,
  };
}

const boundaries = [
  'One Node performance.now clock; timestamps are observer receipt times.',
  'Dispatch to Operation acknowledgement, Agent content, public Tool receipt/output/completion, and authoritative Turn completion.',
  'Tool completion is Agent-reported; no App presentation, actual process start, process exit or process cleanup is inferred.',
  'Version is the Installed Agent Registry version, not a claim about an unreported bundled SDK.',
  'Operator cache labels remain separate from observed path existence.',
];

async function serverMetadata(
  client: RuntimeClient,
): Promise<Pick<SystemInfo, 'version' | 'pid' | 'startedAt'>> {
  const server = SystemInfo.parse(await client.query('system.info'));

  return {
    version: server.version,
    pid: server.pid,
    startedAt: server.startedAt,
  };
}

async function agentMetadata(
  client: RuntimeClient,
  id: string,
): Promise<InstalledRuntimeAgent | null> {
  const agents = operations['agent.list'].result.parse(
    await client.query('agent.list'),
  );

  const agent = agents.find((value) => value.id === id);

  return agent
    ? { id: agent.id, name: agent.name, registryVersion: agent.version }
    : null;
}

async function observe(
  client: RuntimeClient,
  target: RuntimeTarget,
  options: RuntimeOptions,
): Promise<ObservedRuntimeMetadata> {
  const snapshot = await readRuntimeSession(client, target.sessionId);

  return {
    ...observerMetadata(),
    server: await serverMetadata(client),
    installedAgent: await agentMetadata(client, snapshot.agent),
    sessionId: target.sessionId,
    initialChoices: snapshot.configOptions,
    ...(await pathMetadata(options, snapshot.checkout.path)),
  };
}

async function cacheCondition(
  options: RuntimeOptions,
): Promise<Awaited<ReturnType<typeof pathCondition>> | null> {
  return options.cachePath ? pathCondition(options.cachePath) : null;
}

function declaredMetadata(options: RuntimeOptions): Pick<
  RuntimeOptions,
  'condition' | 'cache'
> & {
  serverCommit: string | null;
  reopenBeforeEachTrial: boolean;
} {
  return {
    condition: options.condition,
    cache: options.cache,
    serverCommit: options.serverCommit ?? null,
    reopenBeforeEachTrial: options.reopen,
  };
}

export interface RuntimeMetadata {
  track: 'real-agent-runtime';
  observed: Awaited<ReturnType<typeof observe>>;
  declared: ReturnType<typeof declaredMetadata>;
  boundaries: string[];
}

export async function runtimeMetadata(
  target: RuntimeTarget,
  options: RuntimeOptions,
): Promise<RuntimeMetadata> {
  const connection = runtimeClient(target, AbortSignal.timeout(15_000));

  try {
    return {
      track: 'real-agent-runtime',
      observed: await observe(connection.client, target, options),
      ...declarations(options),
    };
  } finally {
    connection.close();
  }
}

interface InstalledRuntimeAgent {
  id: string;
  name: string;
  registryVersion: string;
}

interface ObservedRuntimeMetadata extends ObserverMetadata {
  server: Awaited<ReturnType<typeof serverMetadata>>;
  installedAgent: InstalledRuntimeAgent | null;
  sessionId: string;
  initialChoices: SessionSnapshot['configOptions'];
  home: Awaited<ReturnType<typeof pathCondition>>;
  checkout: Awaited<ReturnType<typeof pathCondition>>;
  cachePath: Awaited<ReturnType<typeof cacheCondition>>;
}

async function pathMetadata(
  options: RuntimeOptions,
  checkout: string,
): Promise<Pick<ObservedRuntimeMetadata, 'home' | 'checkout' | 'cachePath'>> {
  return {
    home: await pathCondition(options.home),
    checkout: await pathCondition(checkout),
    cachePath: await cacheCondition(options),
  };
}

function declarations(
  options: RuntimeOptions,
): Pick<RuntimeMetadata, 'declared' | 'boundaries'> {
  return { declared: declaredMetadata(options), boundaries };
}
