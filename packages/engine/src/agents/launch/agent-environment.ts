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

// Every Agent program, its ACP process or its sign-in terminal, sees the Project's login-shell env; the Registry vendor row goes last.
export const agentEnvironment = async (
  launch: AgentLaunch,
  defaults: Readonly<Record<string, string>> = {},
): Promise<NodeJS.ProcessEnv> => ({
  ...(await shellEnvironment(launch.cwd)),
  ...defaults,
  ...launch.env,
  ...vendorEnvironment(launch),
});
