import { delimiter } from 'node:path';
import { productCompatibility } from '@repo/contracts/product-identity';
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
export function applySessionEnvironment(
  launch: AgentLaunch,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  delete environment[productCompatibility.environment.token];
  delete environment[productCompatibility.environment.home];

  return addSessionAccess(launch, environment);
}

function addSessionAccess(
  launch: AgentLaunch,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const access = launch.sessionAccess;

  if (!access) return environment;

  environment[productCompatibility.environment.token] = access.token;
  environment[productCompatibility.environment.home] = access.home;
  environment.PATH = [access.cliDirectory, environment.PATH]
    .filter(Boolean)
    .join(delimiter);

  return environment;
}

export const agentEnvironment = async (
  launch: AgentLaunch,
  defaults: Readonly<Record<string, string>> = {},
): Promise<NodeJS.ProcessEnv> =>
  applySessionEnvironment(launch, {
    ...(await shellEnvironment(launch.cwd)),
    ...defaults,
    ...launch.env,
    ...vendorEnvironment(launch),
  });
