import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, spyOn, within } from 'storybook/test';
import { AsidePlaceContext } from '#kit/aside-place-context';
import type { AsidePlace } from '#kit/aside-place-context';
import { settleLayout } from '#mocks/story-layout';
import { Avatar } from '#primitives/content/avatar';
import { Label } from '#primitives/content/label';
import { Link } from '#primitives/content/link';
import { Pill } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { FieldGroup } from './field-group';
import { EditableProperties } from './field-group-properties-editable.mocks';
import { rows, section } from './field-group-properties.mocks';

const path = '~/Developer/argo';

const repoName = 'argo-universal';

const blockedBy = 'Blocked by';

const value = (
  title: string,
  child: ReactElement | ReactElement[],
): ReactElement => (
  <FieldGroup.Value key={title} title={title}>
    {child}
  </FieldGroup.Value>
);

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldGroup/Properties',
  component: FieldGroup,
  args: { children: section(value('Path', <Label text={path} />)) },
} satisfies Meta<typeof FieldGroup>;

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
  args: { children: section(rows) },
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
    children: section(
      value(
        'Repository',
        <Link label={repoName} href="https://example.com/repo" />,
      ),
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
    children: section(
      value('Page', <Link label="Settings" route="/settings" />),
    ),
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
    children: section(
      [
        value('Status', [
          <StatusDot key="dot" tone="info" />,
          <Label key="text" text="Open" />,
        ]),
        value(
          'Repository',
          <Link label={repoName} href="https://example.com/repo" />,
        ),
      ],
      'Details',
    ),
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
    children: section(
      value('Repository', <Link label={repoName} href="javascript:alert(1)" />),
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(repoName)).toBeVisible();
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
  },
};

export const EmptyHasNoFields: Story = {
  args: { children: section([], 'Unused heading') },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Unused heading')).not.toBeInTheDocument();
    await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
  },
};

export const EmptyValuesKeepTheirLabels: Story = {
  args: {
    children: section(
      [
        value('Milestone', <Label text="" />),
        <FieldGroup.Value key="labels" title="Labels" value="" />,
      ],
      'Details',
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Details')).toBeVisible();
    await expect(canvas.getByText('Milestone')).toBeVisible();
    await expect(canvas.getByText('Labels')).toBeVisible();
  },
};

export const PreservesSpokenPath: Story = {
  args: {
    children: section(
      value('Path', <Label text={path} accessibilityLabel={path} />),
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

// The rows where a Screen's aside put them, as Pills under the title or as glyphs alone.
const placed = (place: AsidePlace): Story['render'] =>
  function Placed(args) {
    return (
      <AsidePlaceContext value={place}>
        <FieldGroup {...args} />
      </AsidePlaceContext>
    );
  };

const issueRows = [
  <FieldGroup.Value key="status" title="Status" value="Open">
    <StatusDot tone="info" />
  </FieldGroup.Value>,
  value('Assignee', <Avatar name="Ana Ruiz" accessibilityLabel="Ana Ruiz" />),
  value(blockedBy, <Link label="#41" route="/issues/41" />),
];

export const PillsAreTheFieldsValues: Story = {
  args: { children: section(issueRows) },
  render: placed('pills'),
  play: async ({ canvas, userEvent }) => {
    const navigate = spyOn(router, 'navigate').mockImplementation(() => {});

    try {
      await expect(canvas.getByText('Ana Ruiz')).toBeVisible();
      // A value with no glyph names its field, so "#41" reads as a blocker.
      await expect(canvas.getByText(blockedBy)).toBeVisible();
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
    children: section(
      value(
        'Labels',
        longLabels.map((label) => <Pill key={label} text={label} />),
      ),
    ),
  },
  render: function Narrow(args) {
    return (
      <View testID="row" className="w-80">
        <AsidePlaceContext value="pills">
          <FieldGroup {...args} />
        </AsidePlaceContext>
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
  args: { children: section(issueRows) },
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
    // Two blockers in one row are two fields under one heading.
    children: section([
      ...issueRows.slice(0, 2),
      value(blockedBy, [
        <Link key="41" label="#41" route="/issues/41" />,
        <Link key="57" label="#57" route="/issues/57" />,
      ]),
    ]),
  },
  render: placed('aside'),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(blockedBy)).toHaveLength(1);
    await expect(canvas.queryByText('Status')).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: '#57' })).toBeVisible();
  },
};

const page = within(document.body);

export const PicksAChoice: Story = {
  render: () => <EditableProperties />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Change State' }));

    // The popover opens beside its field, inside the window, not off the top of it.
    const choices = await page.findByRole('dialog', { name: 'State' });

    await expect(choices.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    await userEvent.click(await page.findByText('Closed'));
    await expect(canvas.getByText('Closed')).toBeVisible();
    await expect(canvas.queryByText('Open')).not.toBeInTheDocument();
  },
};

export const CreatesATag: Story = {
  render: () => <EditableProperties />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Change Tags' }));
    await userEvent.type(await page.findByLabelText('Search Tags'), 'epsilon');
    await expect(page.queryByText('beta')).not.toBeInTheDocument();
    await userEvent.click(await page.findByText('Create tag “epsilon”'));
    await expect(canvas.getByText('epsilon')).toBeVisible();
  },
};
