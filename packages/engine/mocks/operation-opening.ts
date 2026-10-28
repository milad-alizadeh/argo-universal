import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { onTestFinished } from 'vitest';
import { agentEnvironment } from '../src/agents';
import { startAcpEngine } from './acp-engine';
import { TestOperationWaitClock } from './operation-wait-clock';
import { operationCaller, publishControlAddress } from './operations';
import { createScriptedAgentProcess } from './scripted-agent';

type Options = { failure?: string };
type OpeningHost = Awaited<ReturnType<typeof startAcpEngine>> & {
  user: Awaited<ReturnType<typeof operationCaller>>;
  clock: TestOperationWaitClock;
  opening: Promise<NewSessionRequest>;
  release: PromiseWithResolvers<void>;
  environment: Promise<NodeJS.ProcessEnv>;
};

// Only the ACP opening and observation clock are controlled; HTTP, storage and CLI remain real.
export async function openingWaitHost(options: Options = {}): Promise<OpeningHost> {
  const clock = new TestOperationWaitClock();
  const opening = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();
  const environment = Promise.withResolvers<NodeJS.ProcessEnv>();
  onTestFinished(() => release.resolve());
  const peer = createScriptedAgentProcess({ steps: [], responses: { 'session/new': [{ received: opening, waitFor: release.promise, error: options.failure }] } });
  const host = await startAcpEngine({ steps: [], operationWaitClock: clock, launchProcess: async (launch) => {
    environment.resolve(await agentEnvironment(launch));
    return peer.launchProcess(launch);
  } });
  publishControlAddress(host);
  return { ...host, agent: peer, user: await operationCaller(host), clock, opening: opening.promise, release, environment: environment.promise };
}
