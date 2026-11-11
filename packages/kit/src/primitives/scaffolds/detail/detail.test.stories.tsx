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

// Each static field is a named group, whether it draws as a row of the aside or as a Pill under the title.
async function expectMetadata(
  canvas: Parameters<Play>[0]['canvas'],
): Promise<void> {
  for (const name of [statusGroup, 'Labels, bug, sync'])
    await expect(canvas.getByRole('group', { name })).toBeVisible();

  // A field that opens something is a link in the aside's rows and a button as a Pill, named for it either way.
  for (const name of [/v1\.2/, /#57/]) {
    const opens = [
      ...canvas.queryAllByRole('link', { name }),
      ...canvas.queryAllByRole('button', { name }),
    ];

    await expect(opens, `${name} opens something`).toHaveLength(1);
  }
}

type Play = NonNullable<Story['play']>;

export const ReadsContentAndMetadata: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: issue.title }),
    ).toBeVisible();
    await expect(canvas.getByText(body)).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Properties' }),
    ).toBeVisible();
    await expectMetadata(canvas);
    await expect(canvas.queryByLabelText('Loading')).not.toBeInTheDocument();
  },
};

type Place = 'above' | 'beside';

// Where the Metadata sits: beside the content in the aside's own column, or as Pills above it.
function metadataPlace(canvas: Parameters<Play>[0]['canvas']): Place {
  const content = canvas.getByText(body).getBoundingClientRect();

  const status = canvas
    .getByRole('group', { name: statusGroup })
    .getBoundingClientRect();

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
    const status = rect(canvas.getByRole('group', { name: statusGroup }));

    await expect(sameEdge(title.left, content.left)).toBe(true);
    await expect(sameEdge(content.left, columnLeft(screen))).toBe(true);
    await expect(status.left).toBeGreaterThan(content.right);
  },
});

const listId = 'list-screen';

const listRows = 'list-rows';

// The App's page beside its sidebar: the Issue, and above it the list it opened from, each the page's width.
function IssueAndList(args: DetailProps & { page: number }): React.JSX.Element {
  const besideSidebar = args.page;

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

// The App's sidebar takes 384 of a window wide enough to show it, and the rail alone below 1072.
const pageAt = (window: number): number => window - (window >= 1072 ? 384 : 56);

/*
 * The list an Issue opens from keeps the Issue's column, so opening an Issue moves neither the title nor the body's
 * edges. Where the aside has its own column it sits beside the body, which gives it width.
 */
function listToIssueAt(window: number, beside: boolean): Story {
  return {
    parameters: { screenPreview: true },
    beforeEach: () => settleLayout(window, 900),
    render: (args) => <IssueAndList {...args} page={pageAt(window)} />,
    play: async ({ canvas }) => {
      await expectMetadata(canvas);
      await waitFor(() => expectOneColumn(canvas));

      if (!beside) return;

      await waitFor(() => expect(metadataPlace(canvas)).toBe('beside'));

      const content = rect(canvas.getByText(body));
      const status = canvas.getByRole('group', { name: statusGroup });

      await expect(rect(status).left).toBeGreaterThan(content.right);
    },
  };
}

export const ListToIssueKeepsColumnAt1024 = listToIssueAt(1024, false);

export const AsideBesideNarrowedColumnAt1440 = listToIssueAt(1440, true);

export const ListToIssueKeepsColumnAt1920 = listToIssueAt(1920, true);

const overflowId = 'overflow-page';

// A page of one width, as the App gives it at each window.
function pageOfWidth(window: number): Story {
  return {
    parameters: { screenPreview: true },
    beforeEach: () => settleLayout(window, 900),
    render: (args) => (
      <View
        testID={overflowId}
        className="h-160"
        style={{ width: pageAt(window) }}
      >
        <Screen title={issue.title} aside={issue.aside}>
          <Detail {...args} />
        </Screen>
      </View>
    ),
    play: async ({ canvas }) => {
      await expectMetadata(canvas);

      const edges = [
        canvas.getByTestId(overflowId),
        canvas.getByRole('group', { name: 'Properties' }),
      ];

      await waitFor(async () => {
        for (const edge of edges)
          await expect(
            edge.scrollWidth,
            `${edge.getAttribute('aria-label') ?? 'page'} is ${edge.scrollWidth} wide in ${edge.clientWidth}`,
          ).toBeLessThanOrEqual(edge.clientWidth);
      });
    },
  };
}

// The aside's column at the widest windows and the Pills under the title at the rest never run past their page.
export const NothingOverflowsAt375 = pageOfWidth(375);

export const NothingOverflowsAt768 = pageOfWidth(768);

export const NothingOverflowsAt1024 = pageOfWidth(1024);

export const NothingOverflowsAt1440 = pageOfWidth(1440);

export const NothingOverflowsAt1920 = pageOfWidth(1920);

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
    const status = canvas.getByRole('group', { name: statusGroup });
    const scroll = canvas.getByTestId(scrollId);
    const { top } = rect(status);

    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    await expect(sameEdge(rect(status).top, top)).toBe(true);
    await expect(canPointAt(status)).toBe(true);
  },
});
