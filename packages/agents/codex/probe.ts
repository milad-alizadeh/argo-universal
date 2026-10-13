import { homedir } from 'node:os';
import type { AgentProbe } from '../src/agent-adapter';
import { findExecutable } from '../src/find-executable';
import { initialize, usesChatGpt } from './handshake';
import { EXECUTABLE, openAppServer } from './open-app-server';
const unavailable: AgentProbe = {
  availability: 'not_installed',
  installStep: 'Install Codex: npm install -g @openai/codex',
};
const signedOut: AgentProbe = {
  availability: 'not_signed_in',
  installStep: 'Run codex login and sign in with ChatGPT',
};
const probeSession = async (
  server: ReturnType<typeof openAppServer>,
): Promise<AgentProbe> =>
  usesChatGpt(await initialize(server))
    ? { availability: 'available' }
    : signedOut;
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
