import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { Screen } from '#primitives/scaffolds/screen';
import { EmptyState } from '#primitives/status/empty-state';
import { Detail } from './detail';
import type { DetailProps } from './detail-props';
import { issue } from './detail.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Detail',
  component: Detail,
  args: issue.detail,
  render: (args): React.JSX.Element => (
    <Screen title={issue.title}>
      <Detail {...args} />
    </Screen>
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

// Whether the Metadata starts below the content's last line or beside it.
function metadataIsBelow(canvas: Parameters<Play>[0]['canvas']): boolean {
  const content = canvas.getByText(body).getBoundingClientRect();

  const status = canvas
    .getByRole('group', { name: 'Status, In progress' })
    .getBoundingClientRect();

  return status.top >= content.bottom;
}

const inContainer = (
  size: 'h-160 w-90' | 'h-160 w-200',
  below: boolean,
): Story => ({
  render: (args) => (
    <View className={size}>
      <Screen title={issue.title}>
        <Detail {...args} />
      </Screen>
    </View>
  ),
  play: async ({ canvas }) => {
    await expectMetadata(canvas);
    await waitFor(() => expect(metadataIsBelow(canvas)).toBe(below));
  },
});

export const NarrowContainerStacksMetadata = inContainer('h-160 w-90', true);

export const WideContainerSplitsColumns = inContainer('h-160 w-200', false);

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

const closeLabel = 'Close Issue';

export const ScreenActionsLeadTheContent: Story = {
  render: (args) => (
    <Screen
      title={issue.title}
      actions={
        <Action key="close" label={closeLabel} icon="check" onPress={closed} />
      }
    >
      <Detail {...args} />
    </Screen>
  ),
  play: async ({ canvas, userEvent }) => {
    closed.mockClear();
    const button = canvas.getByRole('button', { name: closeLabel });

    await userEvent.click(button);
    await expect(closed).toHaveBeenCalledOnce();
    await expect(
      canvas
        .getByRole('heading', { name: issue.title })
        .compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(
      button.compareDocumentPosition(canvas.getByText(body)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};
