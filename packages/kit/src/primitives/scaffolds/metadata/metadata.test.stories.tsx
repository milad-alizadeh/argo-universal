import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { router } from 'expo-router';
import { Component, type ReactNode } from 'react';
import { expect, spyOn } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { Metadata } from './metadata';
import { fields } from './metadata.mocks';

const path = '~/Developer/argo';

const repoName = 'argo-universal';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Metadata',
  component: Metadata,
  args: {
    children: <Metadata.Label title="Path" text={path} />,
  },
} satisfies Meta<typeof Metadata>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadsText: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Path, ~/Developer/argo' }),
    ).toBeVisible();
    await expect(canvas.getByText('Path')).toBeVisible();
    await expect(canvas.getByText(path)).toBeVisible();
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

export const ReadsMixedValues: Story = {
  args: fields,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Device, Milad’s MacBook Pro' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', {
        name: 'Labels, bug, area/sync, good first issue, desktop, needs-review, p2',
      }),
    ).toBeVisible();
    await expect(canvas.getByText('good first issue')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Status, In progress' }),
    ).toBeVisible();
    await expect(canvas.getByText('In progress')).toBeVisible();
    await expect(canvas.getByText('Passed')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Assignee, Milad Alizadeh' }),
    ).toBeVisible();
    await expect(canvas.getByText('Milad Alizadeh')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Reviewer, Alex Chen' }),
    ).toBeVisible();
    await expect(canvas.getByRole('link', { name: repoName })).toBeVisible();
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

export const OpensLinkUrl: Story = {
  args: {
    children: (
      <Metadata.Link
        title="Repository"
        text={repoName}
        href="https://example.com/repo"
      />
    ),
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: repoName });

    await expect(link).toHaveAttribute('href', 'https://example.com/repo');
    await expect(canvas.getByText('Repository')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Repository, argo-universal' }),
    ).toBeVisible();
  },
};

export const NavigatesLinkRoute: Story = {
  args: {
    children: <Metadata.Link title="Page" text="Settings" href="/settings" />,
  },
  play: async ({ canvas, userEvent }) => {
    const navigate = spyOn(router, 'navigate').mockImplementation(() => {});

    try {
      await userEvent.click(canvas.getByRole('link', { name: 'Settings' }));
      await expect(navigate).toHaveBeenCalledWith('/settings');
    } finally {
      navigate.mockRestore();
    }
  },
};

/*
 * A link the page already carries in its Screen's caption: the field draws it wherever the caption does not, and stands
 * down where the caption has it.
 */
const captionedLink: Story = {
  args: {
    title: 'Details',
    children: [
      <Metadata.StatusDot
        key="status"
        title="Status"
        text="Open"
        tone="info"
      />,
      <Metadata.Link
        key="repo"
        title="Repository"
        text={repoName}
        href="https://example.com/repo"
        whenNarrow
      />,
    ],
  },
};

export const NarrowKeepsTheCaptionsLink: Story = {
  ...captionedLink,
  beforeEach: () => settleLayout('phone'),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: repoName })).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Repository, argo-universal' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Status, Open' }),
    ).toBeVisible();
  },
};

export const WideLeavesTheCaptionsLinkOut: Story = {
  ...captionedLink,
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    await expect(canvas.queryByText(repoName)).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('group', { name: 'Status, Open' }),
    ).toBeVisible();
  },
};

export const UnsupportedLinkStaysText: Story = {
  args: {
    children: (
      <Metadata.Link
        title="Repository"
        text={repoName}
        href="javascript:alert(1)"
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(repoName)).toBeVisible();
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
  },
};

export const EmptyHasNoFields: Story = {
  args: { title: 'Unused heading', children: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Unused heading')).not.toBeInTheDocument();
    await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
  },
};

export const EmptyValuesKeepTheirLabels: Story = {
  args: {
    title: 'Details',
    children: [
      <Metadata.Label key="milestone" title="Milestone" text="" />,
      <Metadata.Pills key="labels" title="Labels" />,
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Details')).toBeVisible();
    await expect(canvas.getByText('Milestone')).toBeVisible();
    await expect(canvas.getByText('Labels')).toBeVisible();
  },
};

export const PreservesSpokenPath: Story = {
  args: {
    children: (
      <Metadata.Label title="Path" text={path} accessibilityLabel={path} />
    ),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: '~/Developer/argo' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: 'Path, ~/Developer/argo' }),
    ).not.toBeInTheDocument();
  },
};

interface Raised {
  message?: string;
}

// Shows what a field raised instead of the field.
class RaisedError extends Component<{ children: ReactNode }, Raised> {
  override state: Raised = {};

  static getDerivedStateFromError(error: Error): Raised {
    return { message: error.message };
  }

  override render(): ReactNode {
    return this.state.message === undefined ? (
      this.props.children
    ) : (
      <Text>{this.state.message}</Text>
    );
  }
}

export const FieldOutsideMetadataRaises: Story = {
  render: () => (
    <RaisedError>
      <Metadata.Label title="Path" text={path} />
    </RaisedError>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('A Metadata field draws only inside Metadata.'),
    ).toBeVisible();
    await expect(canvas.queryByText(path)).not.toBeInTheDocument();
  },
};
