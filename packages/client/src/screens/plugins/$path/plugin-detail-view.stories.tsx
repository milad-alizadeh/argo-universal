import {
  counterRoot,
  runListRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginDetailView } from './plugin-detail-view';
import {
  loading,
  developmentPace,
  paceRepositories,
  paceUnavailable,
  issueFilters,
  issueFiltersUnavailable,
  jiraBoard,
  jiraBoardEmpty,
  jiraBoardMoving,
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

// A card the App shows in its new column at once, pending, before Jira answers the move.
export const JiraBoardMoving: StoryObj<typeof meta> = {
  args: jiraBoardMoving,
};

export const JiraBoardEmpty: StoryObj<typeof meta> = {
  args: jiraBoardEmpty,
};

export const Loading: StoryObj<typeof meta> = { args: loading };

export const DevelopmentPace: StoryObj<typeof meta> = { args: developmentPace };

export const PaceRepositories: StoryObj<typeof meta> = {
  args: paceRepositories,
};

export const PaceUnavailable: StoryObj<typeof meta> = { args: paceUnavailable };
