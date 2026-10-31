import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { Screen } from '#primitives/scaffolds/screen';
import { EmptyState } from '#primitives/status/empty-state';
import { canPointAt } from '../../../../mocks/point-hit';
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

const statusGroup = 'Status, In progress';

async function expectMetadata(
  canvas: Parameters<Play>[0]['canvas'],
): Promise<void> {
  await expect(canvas.getByRole('group', { name: statusGroup })).toBeVisible();
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

type Place = 'above' | 'beside';

// Where the Metadata sits: inline above the content, or beside it in its own column.
function metadataPlace(canvas: Parameters<Play>[0]['canvas']): Place {
  const content = canvas.getByText(body).getBoundingClientRect();

  const status = canvas
    .getByRole('group', { name: statusGroup })
    .getBoundingClientRect();

  return status.bottom <= content.top ? 'above' : 'beside';
}

// The Metadata column is headed Properties; inline, the line of values has no heading.
const propertiesHeading = (
  canvas: Parameters<Play>[0]['canvas'],
): Element | null => canvas.queryByRole('heading', { name: 'Properties' });

const inContainer = (
  size: 'h-160 w-90' | 'h-160 w-200',
  place: Place,
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
    await waitFor(() => expect(metadataPlace(canvas)).toBe(place));
    await expect(Boolean(propertiesHeading(canvas))).toBe(place === 'beside');
  },
});

export const NarrowContainerDrawsMetadataInline = inContainer(
  'h-160 w-90',
  'above',
);

export const WideContainerSplitsColumns = inContainer('h-160 w-200', 'beside');

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

const rect = (element: Element): DOMRect => element.getBoundingClientRect();

// Rounding in layout is not a difference in edge.
const sameEdge = (a: number, b: number): boolean => Math.abs(a - b) <= 1;

// A window wide enough for the Screen's capped column, settled before the story renders; the Screen fills the viewport, as in the App.
const onWide = (story: Story): Story => ({
  ...story,
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout('wide'),
});

/*
 * Metadata beside the content widens the Screen's column rather than taking from the content: the heading starts on the
 * content's edge and its Actions end on the Metadata's.
 */
export const MetadataWidensTheColumnNotTheText: Story = onWide({
  render: ScreenActionsLeadTheContent.render,
  play: async ({ canvas }) => {
    await waitFor(() => expect(metadataPlace(canvas)).toBe('beside'));

    const content = rect(canvas.getByText(body));
    const title = rect(canvas.getByRole('heading', { name: issue.title }));
    const action = rect(canvas.getByRole('button', { name: closeLabel }));
    const status = rect(canvas.getByRole('group', { name: statusGroup }));

    await expect(sameEdge(title.left, content.left)).toBe(true);
    await expect(sameEdge(action.right, status.right)).toBe(true);
  },
});

// A phone-wide web window is inside the reading width, so the widened column changes nothing and the Metadata draws inline.
export const PhoneWidthDrawsMetadataInline: Story = {
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout('phone'),
  play: async ({ canvas }) => {
    await expectMetadata(canvas);
    await waitFor(() => expect(metadataPlace(canvas)).toBe('above'));
  },
};

const scrollId = 'detail-scroll';

// Enough description to scroll a 640-tall container well past the Metadata column.
const longBody = [
  body,
  ...Array.from(
    { length: 20 },
    (_, step) => `Step ${step + 1}: fetch, then read the Server log again.`,
  ),
].join('\n\n');

/*
 * The Metadata column keeps its place while the content scrolls under it, so a long description can be read with the
 * Issue's properties still in view.
 */
export const MetadataColumnStaysWhileContentScrolls: Story = {
  args: { ...issue.detail, markdown: longBody, testID: scrollId },
  render: (args) => (
    <View className="h-160 w-200">
      <Screen title={issue.title}>
        <Detail {...args} />
      </Screen>
    </View>
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(metadataPlace(canvas)).toBe('beside'));
    const scroll = canvas.getByTestId(scrollId);
    const status = canvas.getByRole('group', { name: statusGroup });
    const { top } = rect(status);

    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    await expect(sameEdge(rect(status).top, top)).toBe(true);
    await expect(canPointAt(status)).toBe(true);
  },
};
