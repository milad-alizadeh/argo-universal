import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { onTestFinished } from 'vitest';
import { agentEnvironment } from '../src/agents';
import { startAcpEngine } from './acp-engine';
import { TestOperationWaitClock } from './operation-wait-clock';
import { operationCaller, publishControlAddress } from './operations';
import { createScriptedAgentProcess } from './scripted-agent';

type Options = { failure?: string; resume?: boolean };

type OpeningHost = Awaited<ReturnType<typeof startAcpEngine>> & {
  user: Awaited<ReturnType<typeof operationCaller>>;
  clock: TestOperationWaitClock;
  opening: Promise<NewSessionRequest>;
  release: PromiseWithResolvers<void>;
  environment: Promise<NodeJS.ProcessEnv>;
  environments: NodeJS.ProcessEnv[];
};

// Only the ACP opening and observation clock are controlled; HTTP, storage and CLI remain real.
export async function openingWaitHost(
  options: Options = {},
): Promise<OpeningHost> {
  const setup = openingSetup(options);
  const host = await startOpeningEngine(setup);
  publishControlAddress(host);

  return openedHost(host, setup);
}

const openedHost = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  setup: OpeningSetup,
): Promise<OpeningHost> => {
  return {
    ...host,
    agent: setup.peer,
    user: await operationCaller(host),
    clock: setup.clock,
    opening: setup.opening.promise,
    release: setup.release,
    environment: setup.environment.promise,
    environments: setup.environments,
  };
};

type OpeningSetup = {
  clock: TestOperationWaitClock;
  opening: PromiseWithResolvers<NewSessionRequest>;
  release: PromiseWithResolvers<void>;
  environment: PromiseWithResolvers<NodeJS.ProcessEnv>;
  environments: NodeJS.ProcessEnv[];
  peer: ReturnType<typeof createScriptedAgentProcess>;
};

const openingSetup = (options: Options): OpeningSetup => {
  const opening = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());

  return {
    clock: new TestOperationWaitClock(),
    opening,
    release,
    environment: Promise.withResolvers<NodeJS.ProcessEnv>(),
    environments: [],
    peer: openingPeer(options, opening, release),
  };
};

const openingPeer = (
  options: Options,
  opening: OpeningSetup['opening'],
  release: OpeningSetup['release'],
): OpeningSetup['peer'] =>
  createScriptedAgentProcess({
    steps: [],
    responses: {
      [options.resume ? 'session/resume' : 'session/new']: [
        { received: opening, waitFor: release.promise, error: options.failure },
      ],
    },
  });

const startOpeningEngine = (
  setup: OpeningSetup,
): Promise<Awaited<ReturnType<typeof startAcpEngine>>> =>
  startAcpEngine({
    steps: [],
    operationWaitClock: setup.clock,
    launchProcess: (launch) => launchOpeningProcess(setup, launch),
  });

const launchOpeningProcess = async (
  setup: OpeningSetup,
  launch: Parameters<OpeningSetup['peer']['launchProcess']>[0],
): ReturnType<OpeningSetup['peer']['launchProcess']> => {
  const env = await agentEnvironment(launch);
  setup.environment.resolve(env);
  setup.environments.push(env);

  return setup.peer.launchProcess(launch);
};
