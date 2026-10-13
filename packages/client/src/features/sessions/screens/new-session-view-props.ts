import type { AgentInfo } from '@repo/contracts';
import type {
  NewSessionViewProps,
  ReadyNewSessionViewProps,
} from '../components/new-session-view/new-session-view';
import {
  type ChosenSettings,
  chooseAnotherProject,
} from '../state/session-choices';
import { draftProps, openingProps } from './new-session-composer-props';
import {
  hasFailedToLoad,
  type LoadedNewSession,
  loadedNewSession,
} from './new-session-load';
import type { NewSessionWiring, ReadyProps } from './new-session-wiring';
import type { NewSessionData } from './use-new-session-data';

type ConfigurationProps = ReadyNewSessionViewProps['configuration'];

const rechoose = (
  { data, sessionOpening }: NewSessionWiring,
  update: (current: ChosenSettings) => ChosenSettings,
): void => {
  data.setChosen(update);
  sessionOpening.newSession.reset();
};

const projectProps = (
  wiring: NewSessionWiring,
): ReadyProps<'projectId' | 'onProjectChange'> => ({
  projectId: wiring.data.choices.project?.id ?? '',
  onProjectChange: (id) =>
    rechoose(wiring, (current) => chooseAnotherProject(current, id)),
});

const checkoutProps = ({
  choices,
  setChosen,
}: NewSessionData): ConfigurationProps['checkout'] => ({
  branch: choices.baseBranch,
  newWorktree: choices.inNewWorktree,
  onNewWorktreeChange: (newWorktree) =>
    setChosen((current) => ({ ...current, newWorktree })),
});

const agentChoiceProps = (
  wiring: NewSessionWiring,
): Pick<
  ConfigurationProps,
  'onAgentChange' | 'onAgentSetup' | 'onAgentRetry'
> => ({
  onAgentChange: (agent) =>
    rechoose(wiring, (current) => ({ ...current, agent })),
  onAgentSetup: (setup) =>
    wiring.navigate({ to: 'settings-agent', agent: setup }),
  onAgentRetry: wiring.data.agents.retry,
});

const configurationProps = (
  agents: AgentInfo[],
  wiring: NewSessionWiring,
): ConfigurationProps => ({
  agents,
  agent: wiring.data.choices.agent?.agent ?? '',
  configOptions: wiring.data.configuration.configOptions,
  onConfigChange: wiring.data.configuration.change,
  ...agentChoiceProps(wiring),
  checkout: checkoutProps(wiring.data),
});

const setupStepOf = (agent: AgentInfo | undefined): string | undefined =>
  agent && agent.availability !== 'available' ? agent.installStep : undefined;

const noticeProps = ({
  data,
  attachmentDraft,
  sessionOpening,
}: NewSessionWiring): ReadyProps<
  'attachmentError' | 'setupStep' | 'openError'
> => ({
  attachmentError: attachmentDraft.attachmentError?.message,
  setupStep: setupStepOf(data.choices.agent),
  openError: sessionOpening.newSession.error?.message,
});

const readyProps = (
  { serverName, projects, agents }: LoadedNewSession,
  wiring: NewSessionWiring,
): ReadyNewSessionViewProps => ({
  serverName,
  connected: wiring.connected,
  projects,
  ...projectProps(wiring),
  configuration: configurationProps(agents, wiring),
  ...draftProps(wiring),
  ...openingProps(wiring),
  ...noticeProps(wiring),
});

// What New Session shows: its load state, or the ready page over the reader's choices and draft.
export function toNewSessionViewProps(
  wiring: NewSessionWiring,
): NewSessionViewProps {
  if (hasFailedToLoad(wiring.data)) return { state: 'load-failed' };
  const loaded = loadedNewSession(wiring.data);
  if (!loaded) return { state: 'loading' };
  return { state: 'ready', ...readyProps(loaded, wiring) };
}
