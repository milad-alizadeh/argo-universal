import { homedir } from 'node:os';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentProbe } from '../src/agent-adapter';
import { findExecutable } from '../src/find-executable';
import { usesSubscription } from './account';
import { startingValues, toConfigOptions } from './config-options';
import { cliEnvironment, createPromptQueue, EXECUTABLE } from './connect';

export async function probe(signal: AbortSignal): Promise<AgentProbe> {
  const environment = cliEnvironment();
  const executable = findExecutable(EXECUTABLE, environment);
  if (!executable)
    return {
      availability: 'not_installed',
      installStep:
        'Install Claude Code: npm install -g @anthropic-ai/claude-code',
      configOptions: [],
    };
  return probeInstalled(signal, { environment, executable });
}
type Installed = {
  environment: ReturnType<typeof cliEnvironment>;
  executable: string;
};
async function probeInstalled(
  signal: AbortSignal,
  installed: Installed,
): Promise<AgentProbe> {
  const probing = startProbe(signal, installed);
  try {
    return await initializedProbe(probing.vendor);
  } finally {
    probing.close();
  }
}
type Probing = { vendor: ReturnType<typeof query>; close: () => void };
function startProbe(signal: AbortSignal, installed: Installed): Probing {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const queue = createPromptQueue();
  const vendor = query({
    prompt: queue.prompts,
    options: probeOptions(controller, installed),
  });
  const close = probeClose({ signal, abort, queue, vendor });
  return { vendor, close };
}
function probeOptions(
  controller: AbortController,
  { environment, executable }: Installed,
): import('@anthropic-ai/claude-agent-sdk').Options {
  return {
    abortController: controller,
    cwd: homedir(),
    env: environment,
    pathToClaudeCodeExecutable: executable,
  };
}
async function initializedProbe(
  vendor: ReturnType<typeof query>,
): Promise<AgentProbe> {
  const { models, account } = await vendor.initializationResult();
  if (!usesSubscription(account)) return signedOut();
  return {
    availability: 'available',
    configOptions: toConfigOptions(models, startingValues(models, [])),
  };
}

function signedOut(): AgentProbe {
  return {
    availability: 'not_signed_in',
    installStep:
      'Run claude in a terminal and sign in with /login using a Claude subscription',
    configOptions: [],
  };
}

type ProbeCleanup = {
  signal: AbortSignal;
  abort: () => void;
  queue: ReturnType<typeof createPromptQueue>;
  vendor: ReturnType<typeof query>;
};
function probeClose({
  signal,
  abort,
  queue,
  vendor,
}: ProbeCleanup): () => void {
  return (): void => {
    signal.removeEventListener('abort', abort);
    queue.end();
    vendor.close();
  };
}
