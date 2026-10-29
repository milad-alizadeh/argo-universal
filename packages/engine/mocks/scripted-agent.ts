import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import type { AgentLaunch } from '../src/agents';
import { AgentProcessExitError } from '../src/agents';
import type { AcpProcess } from '../src/agents';
import { createScriptedAgentWire } from './scripted-agent-wire';

export { createScriptedAgentWire } from './scripted-agent-wire';

export type ScriptedProcess = ReturnType<typeof createScriptedAgentWire> & {
  launch: AgentLaunch;
  exited: PromiseWithResolvers<void>;
  terminations: number;
};

export const requireScriptedProcessAt = (
  processes: ScriptedProcess[],
  index = 0,
): ScriptedProcess => {
  const process = processes[index];

  if (!process) throw new Error('Missing scripted Agent process');

  return process;
};

interface ScriptedAgentProcesses {
  processes: ScriptedProcess[];
  launchProcess: (launch: AgentLaunch) => Promise<AcpProcess>;
}

export const createScriptedAgentProcess = (
  scenario: ScriptedScenario & { autoExit?: boolean } = { steps: [] },
): ScriptedAgentProcesses => {
  const processes: ScriptedProcess[] = [];
  const nextSessionId = sessionIds();

  return {
    processes,
    launchProcess: async (launch): Promise<AcpProcess> => {
      const run = new ScriptedRun(scenario, launch, nextSessionId);
      processes.push(run.process);

      return run.asProcess();
    },
  };
};

const sessionIds = (): (() => string) => {
  let opened = 0;

  return (): string => `owned-${++opened}`;
};

class ScriptedRun {
  public readonly process: ScriptedProcess;
  private exitError: Error | undefined;
  private readonly wire: ReturnType<typeof createScriptedAgentWire>;
  private readonly exited = Promise.withResolvers<void>();

  public constructor(
    private readonly scenario: ScriptedScenario & { autoExit?: boolean },
    launch: AgentLaunch,
    nextSessionId: () => string,
  ) {
    this.wire = createScriptedAgentWire(scenario, nextSessionId, this.onExit);
    this.process = {
      ...this.wire,
      launch,
      exited: this.exited,
      terminations: 0,
    };
  }

  private readonly onExit = async (
    code: number,
    stderr: string,
  ): Promise<void> => {
    this.exitError = new AgentProcessExitError(code, null, stderr);
    this.exited.resolve();
    this.wire.connection.close();
  };

  public asProcess(): AcpProcess {
    return {
      stream: this.wire.stream,
      exited: this.exited.promise,
      exitError: () => this.exitError ?? new Error('ACP transport broke'),
      terminate: this.terminate,
    };
  }

  private readonly terminate = async (): Promise<void> => {
    this.process.terminations += 1;
    this.wire.connection.close();

    if (this.scenario.autoExit !== false) this.exited.resolve();
  };
}

export const createScriptedAgentLauncher =
  (
    scenarioFor: (launch: AgentLaunch) => ScriptedScenario,
  ): ((launch: AgentLaunch) => Promise<AcpProcess>) =>
  async (launch) =>
    createScriptedAgentProcess(scenarioFor(launch)).launchProcess(launch);
