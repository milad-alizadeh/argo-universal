import { spawn, type IPty } from 'node-pty';
import type { AgentLaunch, LaunchLoginTerminal } from '../agent-launch';
import { definedEnvironment } from '../launch/agent-environment';
import { shellEnvironment } from '../launch/shell-env';
import { ownAuthTerminal } from './pty-owner';

const spawnTerminal = async (launch: AgentLaunch): Promise<IPty> =>
  spawn(launch.executable, [...launch.args], {
    cwd: launch.cwd,
    env: {
      ...definedEnvironment(await shellEnvironment(launch.cwd)),
      ...launch.env,
    },
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
  });

export const launchAuthTerminal: LaunchLoginTerminal = async (
  launch,
  output,
) => {
  const child = await spawnTerminal(launch);
  child.onData(output);

  return ownAuthTerminal(child);
};
