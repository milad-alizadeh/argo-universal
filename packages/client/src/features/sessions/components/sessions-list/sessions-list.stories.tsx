import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { SessionsList } from './sessions-list';
import {
  manySessions,
  noArchivedSessions,
  noMatchingSessions,
  noProjects,
  projectWithoutSessions,
  sessionsByProject,
} from './sessions-list-fixtures';
import { nestedSessions } from './sessions-list-nested-fixtures';

const meta = {
  title: 'Sessions/SessionsList',
  component: SessionsList,
  /*
   * SessionsListProps is declared in sessions-list-props.ts, which react-docgen cannot
   * follow (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    query: { control: 'text', description: 'What the search box holds.' },
    selectedSessionId: {
      control: 'text',
      description: 'The open Session, which its row draws as selected.',
    },
    projects: { control: false, description: 'Every Project to list under.' },
    agents: {
      control: false,
      description: 'The Agents a row takes its logo from.',
    },
    sessions: { control: false, description: 'The Sessions to list.' },
    view: {
      control: false,
      description: 'How the list groups, filters and lays out its rows.',
    },
    onSelect: { control: false },
    onStartSession: { control: false },
    onRename: { control: false },
    onArchive: { control: false },
    onEndReached: { control: false },
    onNewSession: { control: false },
    onProjectSettings: { control: false },
  },
  args: {
    ...sessionsByProject,
    onSelect: action('select Session'),
    onEndReached: action('load next page'),
    onNewSession: action('new Session in Project'),
    onProjectSettings: action('Project settings'),
  },
  // The frame bounds the virtualized list the way the Sessions screen does.
  render: (args): React.JSX.Element => (
    <View className="flex-1 w-full wide:w-frame-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} />
    </View>
  ),
} satisfies Meta<typeof SessionsList>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each Project's Sessions under its heading, most recently active first.
export const ByProject: Story = { args: sessionsByProject };

export const DelegatedWork: Story = { args: nestedSessions };

export const ProjectWithoutSessions: Story = { args: projectWithoutSessions };

/*
 * The three empty states below are the list's own: with no rows it draws its
 * empty state, and what that says comes from this list's query and view.
 * A Session's own states belong to SessionRow.
 */
export const NoProjects: Story = { args: noProjects };

export const NoMatchingSessions: Story = { args: noMatchingSessions };

export const NoArchivedSessions: Story = { args: noArchivedSessions };

export const NewSession: Story = {
  name: 'New Session',
  parameters: { screenPreview: true },
  args: manySessions,
};
