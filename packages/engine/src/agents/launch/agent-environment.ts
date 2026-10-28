import { delimiter } from 'node:path';
import type { AgentLaunch } from '../agent-launch';
import { vendorEnvironment } from '../vendor';
import { shellEnvironment } from './shell-env';

// A sign-in terminal's launch message carries only the names that have values.
export const definedEnvironment = (
  environment: NodeJS.ProcessEnv,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(environment).flatMap(([name, value]): [string, string][] =>
      value === undefined ? [] : [[name, value]],
    ),
  );

// Session identity is authoritative; discovery and sign-in never inherit Argo credentials.
export function applyArgoEnvironment(
  launch: AgentLaunch,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  delete environment.ARGO_TOKEN;
  delete environment.ARGO_HOME;

  if (launch.argo) {
    environment.ARGO_TOKEN = launch.argo.token;
    environment.ARGO_HOME = launch.argo.home;
    environment.PATH = [launch.argo.cliDirectory, environment.PATH]
      .filter(Boolean)
      .join(delimiter);
  }

  return environment;
}

export const agentEnvironment = async (
  launch: AgentLaunch,
  defaults: Readonly<Record<string, string>> = {},
): Promise<NodeJS.ProcessEnv> =>
  applyArgoEnvironment(launch, {
    ...(await shellEnvironment(launch.cwd)),
    ...defaults,
    ...launch.env,
    ...vendorEnvironment(launch),
  });
