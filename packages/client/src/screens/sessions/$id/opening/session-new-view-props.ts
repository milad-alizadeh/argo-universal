import type { AgentInfo } from '@repo/contracts';
import { type ChosenSettings, chooseAnotherProject } from '#features/sessions';
import { agentHref } from '#lib/product/navigation/navigation';
import type {
  SessionNewViewProps,
  ReadySessionNewViewProps,
} from '../session-new-view';
import { draftProps, openingProps } from './new-session-composer-props';
import {
  hasFailedToLoad,
  type LoadedNewSession,
  loadedNewSession,
} from './new-session-load';
import type { NewSessionWiring, ReadyProps } from './new-session-wiring';
import type { NewSessionData } from './use-new-session-data';

type ConfigurationProps = ReadySessionNewViewProps['configuration'];

const rechoose = (
  { data }: NewSessionWiring,
  update: (current: ChosenSettings) => ChosenSettings,
): void => data.setChosen(update);

const ignoreConfigChange = (): void => {};

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
  onAgentSetup: (setup) => wiring.navigate(agentHref(setup)),
  onAgentRetry: wiring.data.agents.retry,
});

const configurationProps = (
  agents: AgentInfo[],
  wiring: NewSessionWiring,
): ConfigurationProps => ({
  agents,
  agent: wiring.data.choices.agent?.agent ?? '',
  configOptions: [],
  onConfigChange: ignoreConfigChange,
  ...wiring.configuration,
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
  'attachmentError' | 'attachmentErrorKey' | 'setupStep' | 'openError'
> => ({
  attachmentError: attachmentDraft.attachmentError?.message,
  attachmentErrorKey: attachmentDraft.attachmentError?.key,
  setupStep: setupStepOf(data.choices.agent),
  openError: sessionOpening.session.error,
});

const readyProps = (
  { serverName, projects, agents }: LoadedNewSession,
  wiring: NewSessionWiring,
): ReadySessionNewViewProps => ({
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
export function toSessionNewViewProps(
  wiring: NewSessionWiring,
): SessionNewViewProps {
  if (hasFailedToLoad(wiring.data)) return { state: 'load-failed' };
  const loaded = loadedNewSession(wiring.data);

  if (!loaded) return { state: 'loading' };

  return { state: 'ready', ...readyProps(loaded, wiring) };
}
