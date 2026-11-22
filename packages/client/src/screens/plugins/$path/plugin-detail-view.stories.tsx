import {
  counterRoot,
  runListRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import {
  PluginDetailView,
  type PluginDetailViewProps,
} from './plugin-detail-view';
import {
  loading,
  loadingJiraList,
  developmentPace,
  homeConnect,
  homeFaders,
  homeFilteredScenes,
  homeManyScenes,
  homeNoMatchingScenes,
  homeNoScenes,
  homeOffLight,
  homePowerPending,
  homeLightEditor,
  homeScenesEditor,
  homeLights,
  homeSignedOut,
  homeUnreachable,
  paceRepositories,
  paceUnavailable,
  issueFilters,
  issueFiltersUnavailable,
  jiraBoard,
  jiraBoardEmpty,
  jiraBoardMoving,
  jiraBoardPaged,
  jiraIssue,
  jiraIssueMoving,
  jiraIssueUnreadable,
  jiraList,
} from './plugin-detail-view-fixtures';

const meta = {
  title: 'Screens/Plugins/Plugin page',
  component: PluginDetailView,
  argTypes: {
    title: { control: 'text' },
    root: { control: false },
    callbacks: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    root: counterRoot,
    callbacks: { onPageCall: action('Page call') },
  },
} satisfies Meta<typeof PluginDetailView>;

export default meta;

export const Page: StoryObj<typeof meta> = {};

export const ListPage: StoryObj<typeof meta> = {
  name: 'List page',
  args: { root: runListRoot },
};

export const IssueFilters: StoryObj<typeof meta> = {
  args: issueFilters,
};

export const IssueFiltersUnavailable: StoryObj<typeof meta> = {
  args: issueFiltersUnavailable,
};

export const JiraIssue: StoryObj<typeof meta> = {
  args: jiraIssue,
};

// A status move the App shows at once, before Jira answers it.
export const JiraIssueMoving: StoryObj<typeof meta> = {
  args: jiraIssueMoving,
};

export const JiraIssueUnreadable: StoryObj<typeof meta> = {
  args: jiraIssueUnreadable,
};

export const JiraList: StoryObj<typeof meta> = {
  args: jiraList,
};

export const JiraBoard: StoryObj<typeof meta> = {
  args: jiraBoard,
};

export const JiraBoardPaged: StoryObj<typeof meta> = {
  args: jiraBoardPaged,
};

// A card the App shows in its new column at once, pending, before Jira answers the move.
export const JiraBoardMoving: StoryObj<typeof meta> = {
  args: jiraBoardMoving,
};

export const JiraBoardEmpty: StoryObj<typeof meta> = {
  args: jiraBoardEmpty,
};

export const Loading: StoryObj<typeof meta> = { args: loading };

export const LoadingJiraList: StoryObj<typeof meta> = {
  args: loadingJiraList,
};

export const DevelopmentPace: StoryObj<typeof meta> = { args: developmentPace };

export const PaceRepositories: StoryObj<typeof meta> = {
  args: paceRepositories,
};

export const PaceUnavailable: StoryObj<typeof meta> = { args: paceUnavailable };

// The Home Plugin's Philips Hue lights: a Grid of Cards per room and light, each with power and brightness.
export const HomeLights: StoryObj<typeof meta> = { args: homeLights };

export const HomeConnect: StoryObj<typeof meta> = { args: homeConnect };

export const HomeUnreachable: StoryObj<typeof meta> = { args: homeUnreachable };

export const HomeSignedOut: StoryObj<typeof meta> = { args: homeSignedOut };

const homeEditors = new Map([
  ['light:light-desk', homeLightEditor.root],
  ['light:light-ceiling', homeOffLight.root],
  ['room:room-office', homeScenesEditor.root],
]);

// Keep the closed Inspector mounted while its native sheet dismisses, as the Home page does.
function closedHome(
  root: PluginDetailViewProps['root'],
): typeof homeFaders.root {
  const layout = homeFaders.root.children[0];

  const inspector = root?.children[0]?.children.find(
    (node) => node.type === 'Inspector',
  );

  if (!layout || !inspector) return homeFaders.root;

  return {
    ...homeFaders.root,
    children: [
      {
        ...layout,
        children: [
          ...layout.children,
          { ...inspector, props: { ...inspector.props, open: false } },
        ],
      },
    ],
  };
}

function InteractiveHome(props: PluginDetailViewProps): ReactElement {
  const [root, setRoot] = useState(props.root);

  return (
    <PluginDetailView
      {...props}
      root={root}
      callbacks={{
        ...props.callbacks,
        onPageCall: async (call, event) => {
          if ('pageState' in call) {
            const { editor, editorOpen } = call.pageState;

            if (editorOpen === false) setRoot(closedHome);
            else if (editorOpen === true && typeof editor === 'string')
              setRoot(homeEditors.get(editor) ?? homeFaders.root);
          }

          await props.callbacks.onPageCall?.(call, event);
        },
      }}
    />
  );
}

export const HomeFaders: StoryObj<typeof meta> = {
  args: homeFaders,
  render: (args) => <InteractiveHome {...args} />,
};

export const HomePowerPending: StoryObj<typeof meta> = {
  args: homePowerPending,
};

export const HomeLightEditor: StoryObj<typeof meta> = {
  args: homeLightEditor,
  render: (args) => <InteractiveHome {...args} />,
};

export const HomeScenesEditor: StoryObj<typeof meta> = {
  args: homeScenesEditor,
  render: (args) => <InteractiveHome {...args} />,
};

export const HomeManyScenes: StoryObj<typeof meta> = { args: homeManyScenes };

export const HomeFilteredScenes: StoryObj<typeof meta> = {
  args: homeFilteredScenes,
};

export const HomeNoMatchingScenes: StoryObj<typeof meta> = {
  args: homeNoMatchingScenes,
};

export const HomeNoScenes: StoryObj<typeof meta> = { args: homeNoScenes };

export const HomeOffLight: StoryObj<typeof meta> = { args: homeOffLight };
