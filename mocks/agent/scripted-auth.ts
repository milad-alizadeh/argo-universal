import { RequestError, type AgentApp } from '@agentclientprotocol/sdk';
import type { Script } from './scripted-handlers.ts';
import type { ScriptedScenario } from './scripted-scenario.ts';

type AuthScript = Pick<Script, 'player' | 'scenario'>;

const serveAuthenticate = (
  app: AgentApp,
  { player, scenario }: AuthScript,
): AgentApp => {
  const authenticate = player.respond('authenticate');

  return app.onRequest('authenticate', async (context) => {
    const response = await authenticate(context, {});

    if (scenario.authentication)
      scenario.authentication.credentials.signedIn = true;

    return response;
  });
};

export const serveOtherMethods = (
  app: AgentApp,
  script: AuthScript,
): AgentApp => {
  const { player, scenario } = script;
  const mode = player.respond('session/set_mode');

  return serveAuthenticate(app, script)
    .onRequest('session/set_mode', (context) => mode(context, {}))
    .onRequest('session/prompt', (context) => {
      requireTurnAuthentication(scenario);

      return player.dispatchPrompt(context);
    });
};

type Authentication = NonNullable<ScriptedScenario['authentication']>;

const signedOut = (
  authentication: Authentication | undefined,
): authentication is Authentication =>
  authentication !== undefined && !authentication.credentials.signedIn;

export const requireScriptedAuthentication = ({
  authentication,
}: ScriptedScenario): void => {
  if (signedOut(authentication) && authentication.turns === undefined)
    throw RequestError.authRequired();
};

// A prompt needs the stored sign-in when the scenario asks its Turns for one.
const requireTurnAuthentication = ({
  authentication,
}: ScriptedScenario): void => {
  if (signedOut(authentication) && authentication.turns !== undefined)
    throw new RequestError(
      RequestError.authRequired().code,
      authentication.turns,
    );
};
