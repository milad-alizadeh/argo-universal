import { homedir } from 'node:os';
import type { AgentProbe } from '../src/agent-adapter';
import { findExecutable } from '../src/find-executable';
import { startingValues, toConfigOptions } from './config-options';
import { initialize, readModels, usesChatGpt } from './handshake';
import { EXECUTABLE, openAppServer } from './open-app-server';
const unavailable: AgentProbe = {
  availability: 'not_installed',
  installStep: 'Install Codex: npm install -g @openai/codex',
  configOptions: [],
};
const signedOut: AgentProbe = {
  availability: 'not_signed_in',
  installStep: 'Run codex login and sign in with ChatGPT',
  configOptions: [],
};
const probeSession = async (
  server: ReturnType<typeof openAppServer>,
): Promise<AgentProbe> => {
  if (!usesChatGpt(await initialize(server))) return signedOut;
  const models = await readModels(server);
  return {
    availability: 'available',
    configOptions: toConfigOptions(models, startingValues(models, [])),
  };
};
export async function probe(signal: AbortSignal): Promise<AgentProbe> {
  if (!findExecutable(EXECUTABLE, process.env)) return unavailable;
  const server = openAppServer({
    cwd: homedir(),
    onMessage: (): void => {},
    onFailure: (): void => {},
    signal,
  });
  try {
    return await probeSession(server);
  } finally {
    await server.close();
  }
}
