import type { SessionNewInput } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type * as React from 'react';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
} from '#components/composer-configuration';
import { LoadError } from '#components/load-error';
import { keyboardAvoidingStyle, Screen } from '#components/screen';
import { StartSessionIn } from '#components/start-session-in';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { useContentWide } from '../components/content-layout';
import { useConnectionState } from '../connection/context';
import { useNavigate } from '../navigation/context';
import type { ClientError } from '../trpc/context';
import { useTRPC } from '../trpc/context';
import { useAgents } from '../trpc/use-agents';

type ProjectsQuery = ReturnType<
  typeof useQuery<
    inferRouterOutputs<AppRouter>['projects']['list'],
    ClientError
  >
>;
interface SessionChoices {
  projects: ProjectsQuery;
  agents: ReturnType<typeof useAgents>;
  project: NonNullable<ProjectsQuery['data']>[number] | undefined;
  agent: NonNullable<ReturnType<typeof useAgents>['data']>[number] | undefined;
  inNewWorktree: boolean;
  baseBranch: string;
  baseBranchLoaded: boolean;
  settings: SessionSettings | undefined;
  chooseProject: (id: string) => void;
  chooseAgent: (agent: string) => void;
  chooseNewWorktree: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

// What a new Session starts with, besides its prompt.
type SessionSettings = Omit<SessionNewInput, 'prompt'>;

// The reader's choices of where and how the Session runs, over the Project's and Agents' defaults.
function useSessionChoices(projectId: string | undefined): SessionChoices {
  const trpc = useTRPC();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useAgents();
  const [chosenProjectId, setChosenProjectId] = useState(projectId);
  const [chosenAgent, setChosenAgent] = useState<string>();
  const [chosenNewWorktree, setChosenNewWorktree] = useState<boolean>();

  const project =
    projects.data?.find((entry) => entry.id === chosenProjectId) ??
    projects.data?.[0];
  const branches = useQuery(
    trpc.projects.branches.queryOptions(
      { projectId: project?.id ?? '' },
      { enabled: project?.checkoutChoice.type === 'main' },
    ),
  );
  const agent =
    agents.data?.find((entry) => entry.agent === chosenAgent) ??
    agents.data?.find((entry) => entry.availability === 'available') ??
    agents.data?.[0];
  const inNewWorktree =
    chosenNewWorktree ?? project?.checkoutChoice.type !== 'main';
  const baseBranch =
    project?.checkoutChoice.type === 'worktree'
      ? project.checkoutChoice.baseBranch
      : (branches.data?.currentBranch ?? 'main');

  const settings: SessionSettings | undefined =
    project && agent
      ? {
          projectId: project.id,
          agent: agent.agent,
          checkout: inNewWorktree
            ? { type: 'worktree', baseBranch }
            : { type: 'main' },
          configOptions: [],
        }
      : undefined;

  return {
    projects,
    agents,
    project,
    agent,
    inNewWorktree,
    baseBranch,
    baseBranchLoaded:
      project?.checkoutChoice.type !== 'main' || branches.data !== undefined,
    settings,
    // Another Project starts from its own checkout default.
    chooseProject: (id: string) => {
      setChosenProjectId(id);
      setChosenNewWorktree(undefined);
    },
    // The selected Agent opens the real Session.
    chooseAgent: (nextAgent: string) => {
      setChosenAgent(nextAgent);
    },
    chooseNewWorktree: setChosenNewWorktree,
  };
}

function NewSessionHeading(): React.JSX.Element {
  return (
    <View className="w-full max-w-composer gap-2 px-4">
      <Text role="heading" aria-level={1} className="type-title">
        What should we work on?
      </Text>
    </View>
  );
}

// Opens the chosen Session before its Composer can offer actual configuration.
export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  const wide = useContentWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const serverInfo = useQuery(trpc.system.info.queryOptions());
  const choices = useSessionChoices(projectId);
  const { projects, agents, project, agent } = choices;
  const newSession = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      onError: () => void agents.refetch(),
    }),
  );

  if (serverInfo.isError || projects.isError || agents.isError)
    return (
      <Screen edges={['bottom']}>
        <View className="flex-1 justify-center">
          <LoadError
            title="Couldn't load New Session"
            description="The Server didn't respond. Check that it's running, then retry."
            onRetry={() => {
              void serverInfo.refetch();
              void projects.refetch();
              void agents.refetch();
            }}
          />
        </View>
      </Screen>
    );
  if (!serverInfo.data || !projects.data || !agents.data)
    return <Screen edges={['bottom']} />;

  const agentAvailable = agent?.availability === 'available';
  const checkout = {
    branch: choices.baseBranch,
    newWorktree: choices.inNewWorktree,
    onNewWorktreeChange: choices.chooseNewWorktree,
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        style={keyboardAvoidingStyle}
      >
        <View className="flex-1 items-center justify-center px-6 pb-10">
          {wide && <NewSessionHeading />}
        </View>
        <View
          className={wide ? 'items-center px-6 pb-2' : 'items-center px-4 pb-2'}
        >
          <StartSessionIn
            serverName={serverInfo.data.name}
            serverConnected={connected}
            projects={projects.data}
            projectId={project?.id ?? ''}
            onProjectChange={(id) => {
              choices.chooseProject(id);
              newSession.reset();
            }}
            checkout={checkout}
            disabled={newSession.isPending}
          />
        </View>
        <View
          className={wide ? 'items-center px-6 pb-4' : 'items-center px-4 pb-4'}
        >
          <View className="w-full max-w-composer gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <ComposerAgentModelControl
                disabled={newSession.isPending}
                configuration={{
                  agents: agents.data,
                  agent: agent?.agent ?? '',
                  configOptions: [],
                  onConfigChange: () => {},
                  onAgentChange: (nextAgent) => {
                    choices.chooseAgent(nextAgent);
                    newSession.reset();
                  },
                  onAgentSetup: (setup) =>
                    navigate({ to: 'settings-agent', agent: setup }),
                  onAgentRetry: agents.retry,
                  checkout,
                }}
              />
              {wide && (
                <ComposerCheckoutControl
                  checkout={checkout}
                  disabled={newSession.isPending}
                />
              )}
              <Button
                accessibilityLabel="Open Session"
                disabled={
                  !connected ||
                  !choices.settings ||
                  !agentAvailable ||
                  !choices.baseBranchLoaded ||
                  newSession.isPending
                }
                onPress={() => {
                  if (choices.settings)
                    newSession.mutate({ ...choices.settings, prompt: [] });
                }}
              >
                {newSession.isPending && (
                  <ActivityIndicator accessibilityLabel="Opening Session" />
                )}
                <Text>Open Session</Text>
              </Button>
            </View>
            {agent && !agentAvailable && (
              <Text role="alert" className="text-destructive">
                {agent.installStep}
              </Text>
            )}
            {newSession.error && (
              <Text role="alert" className="text-destructive">
                Couldn't open the Session. {newSession.error.message}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
