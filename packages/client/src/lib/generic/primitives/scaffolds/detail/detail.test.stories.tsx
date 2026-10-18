import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Page } from '#primitives/scaffolds/page';
import { EmptyState } from '#primitives/status/empty-state';
import { Detail } from './detail';
import type { DetailProps } from './detail-props';
import { issue } from './detail.mocks';

const meta = {
  title: 'Tests/Detail',
  component: Detail,
  args: issue.detail,
  render: (args): React.JSX.Element => (
    <Page title={issue.title}>
      <Detail {...args} />
    </Page>
  ),
} satisfies Meta<typeof Detail>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = issue.detail.markdown;

async function expectMetadata(
  canvas: Parameters<Play>[0]['canvas'],
): Promise<void> {
  await expect(
    canvas.getByRole('group', { name: 'Status, In progress' }),
  ).toBeVisible();
  await expect(
    canvas.getByRole('group', { name: 'Labels, bug, sync' }),
  ).toBeVisible();
  await expect(
    canvas.getByRole('group', { name: 'Milestone, v1.2' }),
  ).toBeVisible();
}

type Play = NonNullable<Story['play']>;

export const ReadsContentAndMetadata: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: issue.title }),
    ).toBeVisible();
    await expect(canvas.getByText(body)).toBeVisible();
    await expectMetadata(canvas);
    await expect(canvas.queryByLabelText('Loading')).not.toBeInTheDocument();
  },
};

// A narrow container moves the Metadata below the content; nothing is clipped or lost.
const inContainer = (size: 'h-160 w-90' | 'h-160 w-200'): Story => ({
  render: (args) => (
    <View className={size}>
      <Page title={issue.title}>
        <Detail {...args} />
      </Page>
    </View>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(body)).toBeVisible();
    await expectMetadata(canvas);
  },
});

export const NarrowContainer = inContainer('h-160 w-90');

export const WideContainer = inContainer('h-160 w-200');

export const LoadingKeepsMetadata: Story = {
  args: { ...issue.detail, isLoading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Loading')).toBeVisible();
    await expect(canvas.queryByText(body)).not.toBeInTheDocument();
    await expectMetadata(canvas);
  },
};

// Story args merge with the meta's, so absent props are listed as undefined.
const empty: DetailProps = {
  markdown: undefined,
  metadata: issue.detail.metadata,
  children: <EmptyState title="No description" icon="issue" />,
};

export const EmptyContentKeepsMetadata: Story = {
  args: empty,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'No description' }),
    ).toBeVisible();
    await expect(canvas.queryByText(body)).not.toBeInTheDocument();
    await expectMetadata(canvas);
  },
};

export const ComposedContentFollowsMarkdown: Story = {
  args: {
    ...issue.detail,
    children: <Text>Workaround: fetch with a shallow depth first.</Text>,
  },
  play: async ({ canvas }) => {
    const markdown = canvas.getByText(body);

    const composed = canvas.getByText(
      'Workaround: fetch with a shallow depth first.',
    );

    await expect(composed).toBeVisible();
    await expect(
      markdown.compareDocumentPosition(composed) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

export const WithoutMetadata: Story = {
  args: { markdown: body, metadata: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(body)).toBeVisible();
    await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
  },
};

const closed = fn();

export const ActionsJoinThePageHeader: Story = {
  args: {
    ...issue.detail,
    actions: (
      <ActionList>
        <Action label="Close Issue" icon="check" onPress={closed} />
      </ActionList>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    closed.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Close Issue' }));
    await expect(closed).toHaveBeenCalledOnce();
    await expect(
      canvas.getAllByRole('button', { name: 'Close Issue' }),
    ).toHaveLength(1);
  },
};
