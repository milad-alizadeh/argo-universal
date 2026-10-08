import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionOptions,
} from '@repo/api/mocks';
import type {
  AgentInfo,
  PlanEntry,
  SessionConfigOption,
} from '@repo/contracts';
import { useState } from 'react';
import {
  Composer,
  type ComposerImage,
  type ComposerProps,
} from '../src/components/composer';

const imageUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGN4piFHU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULANahsD1zXuJAAAAAAElFTkSuQmCC';

export const composerLongAgentCatalog: AgentInfo[] = Array.from(
  { length: 40 },
  (_, index) => {
    const agent = newSessionCatalogs.bothAvailable[0];
    if (!agent) throw new Error('Composer needs an available Agent mock.');
    return {
      ...agent,
      agent: `development-agent-${index + 1}`,
      label: `Agent ${String(index + 1).padStart(2, '0')}`,
    };
  },
);

export const composerImages: ComposerImage[] = newSessionInputs.flatMap(
  ({ agent, prompt }) =>
    prompt.flatMap((block) =>
      block.type === 'image'
        ? [
            {
              id: `${agent}:image`,
              name: 'screenshot.png',
              uri: imageUri,
              bytes: block.blob.bytes,
            },
          ]
        : [],
    ),
);

const imageFromContract = composerImages[0];
if (!imageFromContract)
  throw new Error('New Session contract mock needs an image.');
export const oversizedComposerImage: ComposerImage = {
  ...imageFromContract,
  name: 'full-screen.png',
  bytes: 27 * 1024 * 1024,
};

export const composerPlan: PlanEntry[] = [
  {
    content: 'Inspect the Composer layout',
    priority: 'high',
    status: 'completed',
  },
  {
    content: 'Update the shared controls',
    priority: 'high',
    status: 'in_progress',
  },
  {
    content: 'Verify phone and desktop',
    priority: 'medium',
    status: 'pending',
  },
];

export const composerPlanDone: PlanEntry[] = composerPlan.map((entry) => ({
  ...entry,
  status: 'completed',
}));

export const composerNoEffortSelections = newSessionCatalogs.bothAvailable.map(
  (agent) => ({
    agents: newSessionCatalogs.bothAvailable,
    agent: agent.agent,
    configOptions: agent.configOptions.map((option) =>
      option.category === 'thought_level' && option.type === 'select'
        ? { ...option, currentValue: 'unsupported' }
        : option,
    ),
    onConfigChange: () => {},
    checkout: { branch: 'main', newWorktree: false },
  }),
);

export const composerUnavailableConfigurations =
  newSessionCatalogs.bothUnavailable.map((agent) => ({
    agents: newSessionCatalogs.bothUnavailable,
    agent: agent.agent,
    configOptions: agent.configOptions,
    onConfigChange: () => {},
    checkout: { branch: 'main', newWorktree: false },
  }));

export function ComposerMock(
  props: ComposerProps & {
    initialAgent?: AgentInfo['agent'];
    sessionStarted?: boolean;
    running?: boolean;
    // Replaces the Session's Plan; an empty list means the Agent has none.
    plan?: PlanEntry[];
  },
) {
  const [draft, setDraft] = useState(props.draft);
  const [agent, setAgent] = useState(
    props.initialAgent ?? newSessionCatalogs.bothAvailable[0]?.agent ?? '',
  );
  const catalog = newSessionOptions.find((entry) => entry.agent === agent);
  const [configOptions, setConfigOptions] = useState<SessionConfigOption[]>(
    catalog?.configOptions ?? [],
  );
  const branch = newSessionBranches.currentBranch ?? 'main';
  const [newWorktree, setNewWorktree] = useState(true);
  const [running, setRunning] = useState(props.running ?? false);
  const [usedContext, setUsedContext] = useState(34_000);
  return (
    <Composer
      {...props}
      draft={draft}
      onAttachCamera={props.onAttachCamera ?? props.onAttachImages}
      onAttachFiles={props.onAttachFiles}
      onSelectSlashCommand={props.onSelectSlashCommand}
      onCreateGoal={props.onCreateGoal}
      onStop={
        props.onStop
          ? () => {
              setRunning(false);
              props.onStop?.();
            }
          : undefined
      }
      status={
        props.status ?? {
          usage: {
            limits: [
              {
                label: '5-hour limit',
                usedPercent: 54,
                resets: 'Resets in 2h 14m',
              },
              {
                label: 'Weekly limit',
                usedPercent: 31,
                resets: 'Resets Thursday at 09:00',
              },
            ],
          },
          ...(props.sessionStarted
            ? {
                plan: props.plan ?? composerPlan,
                subagents: { count: 2, running: true, onPress: () => {} },
                shells: { count: 1, running: false, onPress: () => {} },
                context: {
                  used: usedContext,
                  size: 200_000,
                  onCompact: () => setUsedContext(12_000),
                },
              }
            : {}),
        }
      }
      configuration={
        props.configuration ?? {
          agents: newSessionCatalogs.bothAvailable,
          agent,
          configOptions,
          turnRunning: running,
          onAgentChange: props.sessionStarted
            ? undefined
            : (nextAgent) => {
                setAgent(nextAgent);
                setConfigOptions(
                  newSessionOptions.find((entry) => entry.agent === nextAgent)
                    ?.configOptions ?? [],
                );
              },
          onConfigChange: (configId, value) => {
            const option = configOptions.find(
              (entry) => entry.configId === configId,
            );
            if (props.sessionStarted && option?.category === 'model') {
              const options =
                option.type === 'select'
                  ? option.options.flatMap((entry) =>
                      'groupId' in entry ? entry.options : [entry],
                    )
                  : [];
              const index = options.findIndex((entry) => entry.value === value);
              const modelOptions = catalog?.configOptionsByModel[index];
              if (modelOptions) {
                setConfigOptions(modelOptions);
                return;
              }
            }
            setConfigOptions((previous) =>
              previous.map((entry) => {
                if (entry.configId !== configId) return entry;
                if (entry.type === 'select' && typeof value === 'string')
                  return { ...entry, currentValue: value };
                if (entry.type === 'boolean' && typeof value === 'boolean')
                  return { ...entry, currentValue: value };
                return entry;
              }),
            );
          },
          checkout: {
            branch,
            newWorktree,
            onNewWorktreeChange: props.sessionStarted
              ? undefined
              : setNewWorktree,
            ...(props.sessionStarted
              ? {
                  path: '/Developer/project/.worktrees/session',
                }
              : {}),
          },
        }
      }
      onDraftChange={(next) => {
        setDraft(next);
        props.onDraftChange(next);
      }}
      onSend={(sent) => {
        props.onSend(sent);
        setDraft({ text: '', images: [] });
      }}
      onAttachImages={() => {
        const image = composerImages.find(
          (image) => !draft.images.some((attached) => attached.id === image.id),
        );
        if (image) setDraft({ ...draft, images: [...draft.images, image] });
        props.onAttachImages();
      }}
    />
  );
}
