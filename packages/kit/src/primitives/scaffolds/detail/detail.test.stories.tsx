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
    <Screen title={issue.title} aside={issue.aside}>
      <Detail {...args} />
    </Screen>
  ),
} satisfies Meta<typeof Detail>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = issue.detail.markdown;

const statusGroup = 'Status, In progress';

// Each field names itself, whether it draws as a row of the aside or as a Pill under the title.
async function expectMetadata(
  canvas: Parameters<Play>[0]['canvas'],
): Promise<void> {
  await expect(canvas.getByLabelText(statusGroup)).toBeVisible();
  await expect(canvas.getByLabelText('Labels, bug, sync')).toBeVisible();
  await expect(canvas.getByLabelText('Milestone, v1.2')).toBeVisible();
  await expect(canvas.getByLabelText('Blocked by, #57')).toBeVisible();
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

// Where the Metadata sits: beside the content in the aside's own column, or as Pills above it.
function metadataPlace(canvas: Parameters<Play>[0]['canvas']): Place {
  const content = canvas.getByText(body).getBoundingClientRect();
  const status = canvas.getByLabelText(statusGroup).getBoundingClientRect();

  if (status.left >= content.right) return 'beside';

  return status.bottom <= content.top ? 'above' : 'beside';
}

const inContainer = (
  size: 'h-160 w-90' | 'h-160 w-192',
  play: Play,
): Story => ({
  render: (args) => (
    <View className={size}>
      <Screen title={issue.title} aside={issue.aside}>
        <Detail {...args} />
      </Screen>
    </View>
  ),
  play,
});

// A tablet-wide page has no gutter for the aside, so its fields are Pills that lead the content, each with its value.
export const TabletWidthLeadsWithPills = inContainer(
  'h-160 w-192',
  async ({ canvas }) => {
    await expectMetadata(canvas);
    await waitFor(() => expect(metadataPlace(canvas)).toBe('above'));
    await expect(canvas.getByText('Ana Ruiz')).toBeVisible();
  },
);

// Below medium a Pill with a glyph shows the glyph alone; the status keeps its words.
export const PhoneWidthShowsIconsAlone = inContainer(
  'h-160 w-90',
  async ({ canvas }) => {
    await expectMetadata(canvas);
    await waitFor(() => expect(canvas.queryByText('Ana Ruiz')).toBeNull());
    await expect(canvas.getByText('In progress')).toBeVisible();
  },
);

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
  args: { markdown: body },
  render: (args) => (
    <Screen title={issue.title}>
      <Detail {...args} />
    </Screen>
  ),
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
      aside={issue.aside}
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

const screenId = 'detail-screen';

// A window wide enough for the aside's own column, settled before the story renders; the Screen fills the viewport, as in the App.
const onWidest = (story: Story): Story => ({
  ...story,
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout(1920),
});

// The column a Screen without an aside keeps: the reading width and its inset each side, centred.
const columnLeft = (screen: DOMRect): number =>
  screen.left + (screen.width - (800 + 2 * 32)) / 2 + 32;

/*
 * The aside takes the right gutter and never the content's room: the title and the content start where a page without
 * an aside starts them.
 */
export const AsideNeverMovesTheTitle: Story = onWidest({
  render: (args) => (
    <Screen title={issue.title} aside={issue.aside} testID={screenId}>
      <Detail {...args} />
    </Screen>
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(metadataPlace(canvas)).toBe('beside'));

    const content = rect(canvas.getByText(body));
    const title = rect(canvas.getByRole('heading', { name: issue.title }));
    const screen = rect(canvas.getByTestId(screenId));
    const status = rect(canvas.getByLabelText(statusGroup));

    await expect(sameEdge(title.left, content.left)).toBe(true);
    await expect(sameEdge(content.left, columnLeft(screen))).toBe(true);
    await expect(status.left).toBeGreaterThan(content.right);
  },
});

const listId = 'list-screen';

const listRows = 'list-rows';

// The App's page beside its 384 sidebar at 1440: the Issue, and above it the list it opened from, each the page's width.
const besideSidebar = 1440 - 384;

function IssueAndList(args: DetailProps): React.JSX.Element {
  return (
    <View>
      <View className="h-80" style={{ width: besideSidebar }}>
        <Screen title="Open" testID={listId}>
          <View testID={listRows}>
            <Text>Rows run the width of the column.</Text>
          </View>
        </Screen>
      </View>
      <View className="h-80" style={{ width: besideSidebar }}>
        <Screen title={issue.title} aside={issue.aside} testID={screenId}>
          <Detail {...args} />
        </Screen>
      </View>
    </View>
  );
}

type Canvas = Parameters<Play>[0]['canvas'];

// The list's title, body left and body width from its page, each beside the Issue's from its own.
function columnEdges(canvas: Canvas): [number, number][] {
  const list = rect(canvas.getByTestId(listId));
  const page = rect(canvas.getByTestId(screenId));
  const listTitle = rect(canvas.getByRole('heading', { name: 'Open' }));
  const title = rect(canvas.getByRole('heading', { name: issue.title }));
  const rows = rect(canvas.getByTestId(listRows));
  const content = rect(canvas.getByText(body));

  return [
    [listTitle.left - list.left, title.left - page.left],
    [rows.left - list.left, content.left - page.left],
    [rows.width, content.width],
  ];
}

async function expectOneColumn(canvas: Canvas): Promise<void> {
  const edges = columnEdges(canvas);

  await expect(
    edges.every(([list, page]) => sameEdge(list, page)),
    `list and Issue edges ${JSON.stringify(edges)}`,
  ).toBe(true);
}

/*
 * At 1440 with the sidebar shown the aside has its own column, which the body gives width to. The list it opened from
 * keeps the same column, so opening an Issue moves neither the title nor the body's edges.
 */
export const AsideBesideNarrowedColumnAt1440: Story = {
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout(1440),
  render: (args) => <IssueAndList {...args} />,
  play: async ({ canvas }) => {
    await waitFor(() => expect(metadataPlace(canvas)).toBe('beside'));
    await waitFor(() => expectOneColumn(canvas));

    const content = rect(canvas.getByText(body));

    await expect(rect(canvas.getByLabelText(statusGroup)).left).toBeGreaterThan(
      content.right,
    );
  },
};

// A phone-wide web window draws icon Pills above the content.
export const PhoneWindowLeadsWithIcons: Story = {
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout('phone'),
  play: async ({ canvas }) => {
    await expectMetadata(canvas);
    await waitFor(() => expect(metadataPlace(canvas)).toBe('above'));
  },
};

const scrollId = 'detail-scroll';

// Enough description to scroll the page well past the aside.
const longBody = [
  body,
  ...Array.from(
    { length: 40 },
    (_, step) => `Step ${step + 1}: fetch, then read the Server log again.`,
  ),
].join('\n\n');

// The aside keeps its place while the content scrolls, so a long description is read with the Issue's properties in view.
export const AsideStaysWhileContentScrolls: Story = onWidest({
  args: { ...issue.detail, markdown: longBody, testID: scrollId },
  play: async ({ canvas }) => {
    await waitFor(() => expect(metadataPlace(canvas)).toBe('beside'));
    const status = canvas.getByLabelText(statusGroup);
    const scroll = canvas.getByTestId(scrollId);
    const { top } = rect(status);

    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    await expect(sameEdge(rect(status).top, top)).toBe(true);
    await expect(canPointAt(status)).toBe(true);
  },
});
