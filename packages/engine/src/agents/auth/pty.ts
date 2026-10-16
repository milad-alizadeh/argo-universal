import { spawn, type IPty } from 'node-pty';
import type {
  AgentLaunch,
  LaunchLoginTerminal,
  LoginTerminalProcess,
} from '../agent-launch';
import { definedEnvironment } from '../launch/agent-environment';
import { shellEnvironment } from '../launch/shell-env';

const ownTerminal = (child: IPty): LoginTerminalProcess => {
  const exited = new Promise<{ exitCode: number; signal?: number }>((resolve) =>
    child.onExit(resolve),
  );

  return {
    exited,
    write: (text) => child.write(text),
    resize: (cols, rows) => child.resize(cols, rows),
    close: async () => {
      child.kill();
      await exited;
    },
  };
};

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

  return ownTerminal(child);
};
