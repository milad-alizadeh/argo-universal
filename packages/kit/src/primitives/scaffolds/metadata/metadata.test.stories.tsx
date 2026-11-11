import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { router } from 'expo-router';
import { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import { expect, spyOn } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import type { AsidePlace } from '../screen/screen-aside-place';
import { Metadata } from './metadata';
import { MetadataPlaceContext } from './metadata-drawing-context';
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

// A linked field is the page's one carrier of that link, so it draws at every width.
const linkedField: Story = {
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
      />,
    ],
  },
};

const drawsTheLink: Story['play'] = async ({ canvas }) => {
  await expect(canvas.getByRole('link', { name: repoName })).toBeVisible();
  await expect(
    canvas.getByRole('group', { name: 'Repository, argo-universal' }),
  ).toBeVisible();
  await expect(
    canvas.getByRole('group', { name: 'Status, Open' }),
  ).toBeVisible();
};

export const NarrowDrawsTheLink: Story = {
  ...linkedField,
  beforeEach: () => settleLayout('phone'),
  play: drawsTheLink,
};

export const WideDrawsTheLink: Story = {
  ...linkedField,
  beforeEach: () => settleLayout('wide'),
  play: drawsTheLink,
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

// Metadata where a Screen's aside put it, as Pills under the title or as glyphs alone.
const placed = (place: AsidePlace): Story['render'] =>
  function Placed(args) {
    return (
      <MetadataPlaceContext value={place}>
        <Metadata {...args} />
      </MetadataPlaceContext>
    );
  };

const issueFields = [
  <Metadata.StatusDot key="status" title="Status" text="Open" tone="info" />,
  <Metadata.Avatar key="assignee" title="Assignee" name="Ana Ruiz" />,
  <Metadata.Link
    key="blocker"
    title="Blocked by"
    text="#41"
    href="/issues/41"
  />,
];

export const PillsAreTheFieldsValues: Story = {
  args: { children: issueFields },
  render: placed('pills'),
  play: async ({ canvas, userEvent }) => {
    const navigate = spyOn(router, 'navigate').mockImplementation(() => {});

    try {
      await expect(canvas.getByText('Ana Ruiz')).toBeVisible();
      // A value with no glyph names its field, so "#41" reads as a blocker.
      await expect(canvas.getByText('Blocked by')).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Blocked by, #41' }),
      );
      await expect(navigate).toHaveBeenCalledWith('/issues/41');
    } finally {
      navigate.mockRestore();
    }
  },
};

const longLabels = [
  'needs-design-review',
  'blocked-on-upstream-release',
  'documentation-follow-up',
  'priority: high',
  'area: plugins',
];

// A long label list wraps inside the row it sits in instead of running past it.
export const LongLabelsWrapInTheirRow: Story = {
  args: {
    children: (
      <Metadata.Pills title="Labels">
        {longLabels.map((label) => (
          <Pill key={label} text={label} />
        ))}
      </Metadata.Pills>
    ),
  },
  render: function Narrow(args) {
    return (
      <View testID="row" className="w-80">
        <MetadataPlaceContext value="pills">
          <Metadata {...args} />
        </MetadataPlaceContext>
      </View>
    );
  },
  play: async ({ canvas }) => {
    const row = canvas.getByTestId('row').getBoundingClientRect();

    const ends = longLabels.map(
      (label) => canvas.getByText(label).getBoundingClientRect().right,
    );

    await expect(
      { inside: Math.max(...ends) <= row.right + 0.5 },
      `labels end at ${Math.max(...ends)} past ${row.right}`,
    ).toEqual({ inside: true });
  },
};

export const IconsKeepTheStatusInWords: Story = {
  args: { children: issueFields },
  render: placed('icons'),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Open')).toBeVisible();
    await expect(canvas.queryByText('Ana Ruiz')).not.toBeInTheDocument();
    await expect(canvas.getByLabelText('Assignee, Ana Ruiz')).toBeVisible();
    await expect(canvas.getByText('#41')).toBeVisible();
  },
};

export const AsideHeadsGroupsButNotGlyphs: Story = {
  args: {
    children: [
      ...issueFields,
      <Metadata.Link
        key="second"
        title="Blocked by"
        text="#57"
        href="/issues/57"
      />,
    ],
  },
  render: placed('aside'),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Blocked by')).toHaveLength(1);
    await expect(canvas.queryByText('Status')).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: '#57' })).toBeVisible();
  },
};
