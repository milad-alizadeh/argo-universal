import { execFileSync } from 'node:child_process';
import type {
  PromptRequest,
  ResumeSessionRequest,
  NewSessionRequest,
  SetSessionConfigOptionRequest,
  SessionConfigOption,
} from '@agentclientprotocol/sdk';
import type { SessionNewInput } from '@repo/contracts';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { startAcpEngine } from './acp-engine';

export const sessionConfiguration: Extract<
  SessionConfigOption,
  { type: 'select' }
>[] = [
  {
    id: 'model',
    name: 'Model',
    category: 'model',
    type: 'select',
    currentValue: 'small',
    options: [
      { value: 'small', name: 'Small' },
      { value: 'large', name: 'Large' },
    ],
  },
];
export const newSession: SessionNewInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' },
  configOptions: [{ configId: 'model', value: 'large' }],
  prompt: [{ type: 'text', text: 'Build it\nand test it' }],
};
type Observations = {
  prompts: PromptRequest[];
  resumes: ResumeSessionRequest[];
  openings: NewSessionRequest[];
  settings: SetSessionConfigOptionRequest[];
};
type SessionJourney = Awaited<ReturnType<typeof startAcpEngine>> &
  Observations & {
    git: (...arguments_: string[]) => string;
  };
const configuredOptions = (value: string): SessionConfigOption[] =>
  sessionConfiguration.map((option) => ({ ...option, currentValue: value }));
const appliedResponses = (
  settings: SetSessionConfigOptionRequest[],
  values: readonly string[],
): NonNullable<ScriptedScenario['responses']>['session/set_config_option'] =>
  values.map((value) => ({
    requests: settings,
    result: {
      configOptions: configuredOptions(value),
    },
  }));
const journeyScenario = (
  observed: Observations,
  values: readonly string[],
): ScriptedScenario => ({
  steps: [{ type: 'wait-for-cancel' }],
  configOptions: sessionConfiguration,
  responses: {
    'session/new': [{ requests: observed.openings }],
    'session/resume': [{ requests: observed.resumes }],
    'session/set_config_option': appliedResponses(observed.settings, values),
    'session/prompt': [{ requests: observed.prompts }],
  },
});
export const sessionJourneyGit =
  (directory: string): SessionJourney['git'] =>
  (...arguments_) =>
    execFileSync('git', arguments_, {
      cwd: directory,
      encoding: 'utf8',
    }).trim();
const createJourneyObservations = (): Observations => ({
  prompts: [],
  resumes: [],
  openings: [],
  settings: [],
});
export const startSessionJourney = async (
  values: readonly string[] = ['large'],
): Promise<SessionJourney> => {
  const observed = createJourneyObservations();
  const host = await startAcpEngine(journeyScenario(observed, values));
  const project = (await host.caller.projects.list()).find(
    ({ id }) => id === 'project-1',
  );
  if (!project) throw new Error('No Project');
  return { ...host, ...observed, git: sessionJourneyGit(project.path) };
};
