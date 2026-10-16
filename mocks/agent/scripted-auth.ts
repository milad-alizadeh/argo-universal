import { existsSync, writeFileSync } from 'node:fs';
import { RequestError, type AgentApp } from '@agentclientprotocol/sdk';
import type { Script } from './scripted-handlers.ts';
import type { ScriptedScenario } from './scripted-scenario.ts';

export const serveOtherMethods = (
  app: AgentApp,
  { player, scenario }: Pick<Script, 'player' | 'scenario'>,
): AgentApp => {
  const authenticate = player.respond('authenticate');
  const mode = player.respond('session/set_mode');

  return app
    .onRequest('authenticate', async (context) => {
      const response = await authenticate(context, {});

      if (scenario.authentication)
        writeFileSync(scenario.authentication.credentials, 'signed-in');

      return response;
    })
    .onRequest('session/set_mode', (context) => mode(context, {}));
};

export const requireScriptedAuthentication = (
  scenario: ScriptedScenario,
): void => {
  if (
    scenario.authentication &&
    !existsSync(scenario.authentication.credentials)
  )
    throw RequestError.authRequired();
};
