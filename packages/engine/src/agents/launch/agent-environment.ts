import { delimiter } from 'node:path';
import { productCompatibility } from '@repo/contracts/product-identity';
import type { AgentLaunch } from '../agent-launch';
import { vendorEnvironment, vendorSessionEnvironment } from '../vendor';
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

type SessionAccess = NonNullable<AgentLaunch['sessionAccess']>;

function addSessionAccess(
  launch: AgentLaunch,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const access = launch.sessionAccess;

  if (!access) return environment;

  return Object.assign(
    environment,
    accessEnvironment(access, environment.PATH),
    vendorSessionEnvironment(launch, access.cliDirectory, environment),
  );
}

const { environment: names } = productCompatibility;

type AccessEnvironment = Record<
  typeof names.token | typeof names.home,
  string
> &
  Partial<Record<typeof names.todoList, '0'>> & { PATH: string };

// The `argo` launcher goes first on PATH so the Agent's shell runs this Server's CLI, not another checkout's.
function accessEnvironment(
  access: SessionAccess,
  path: string | undefined,
): AccessEnvironment {
  const added: AccessEnvironment = {
    [names.token]: access.token,
    [names.home]: access.home,
    PATH: [access.cliDirectory, path].filter(Boolean).join(delimiter),
  };

  if (access.todoList === false) added[names.todoList] = '0';

  return added;
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
