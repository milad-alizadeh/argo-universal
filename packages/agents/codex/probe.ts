import { homedir } from 'node:os';
import type { AgentProbe } from '../src/agent-adapter';
import { describeError } from '../src/describe-error';
import { findExecutable } from '../src/find-executable';
import { startingValues, toConfigOptions } from './config-options';
import { EXECUTABLE, initialize, readModels } from './handshake';
import { openAppServer } from './open-app-server';

export async function probe(signal: AbortSignal): Promise<AgentProbe> {
  if (!findExecutable(EXECUTABLE, process.env))
    return {
      availability: 'not_installed',
      installStep: 'Install Codex: npm install -g @openai/codex',
      configOptions: [],
    };
  const server = openAppServer(
    homedir(),
    () => {},
    () => {},
    signal,
  );
  try {
    if (!(await initialize(server)).signedIn)
      return {
        availability: 'not_signed_in',
        installStep: 'Run codex login and sign in with ChatGPT',
        configOptions: [],
      };
    const models = await readModels(server);
    return {
      availability: 'available',
      configOptions: toConfigOptions(models, startingValues(models, [])),
    };
  } catch (error) {
    return {
      availability: 'unavailable',
      installStep: `Codex did not start: ${describeError(error)}`,
      configOptions: [],
    };
  } finally {
    await server.close();
  }
}
