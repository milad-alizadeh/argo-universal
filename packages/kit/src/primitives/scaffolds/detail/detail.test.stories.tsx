import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { nextFrames } from '#mocks/next-frames';
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

// Each value row is a named group, in the aside's own column or above the body.
async function expectProperties(
  canvas: Parameters<Play>[0]['canvas'],
): Promise<void> {
  for (const name of [statusGroup, 'Labels, bug, sync'])
    await expect(canvas.getByRole('group', { name })).toBeVisible();

  // A row that opens something is pressable, named for its value.
  for (const name of [/v1\.2/]) {
    const opens = [
      ...canvas.queryAllByRole('link', { name }),
      ...canvas.queryAllByRole('button', { name }),
    ];

    await expect(opens, `${name} opens something`).toHaveLength(1);
  }
}

type Play = NonNullable<Story['play']>;

export const ReadsContentAndProperties: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: issue.title }),
    ).toBeVisible();
    await expect(canvas.getByText(body)).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Properties' }),
    ).toBeVisible();
    await expectProperties(canvas);
    await expect(canvas.queryByLabelText('Loading')).not.toBeInTheDocument();
  },
};

type Place = 'above' | 'beside';

// Where the properties sit: beside the content in the aside's own column, or above it.
function propertiesPlace(canvas: Parameters<Play>[0]['canvas']): Place {
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

// A tablet-wide page draws every row of the aside with its value.
export const TabletWidthShowsEveryValue = inContainer(
  'h-160 w-192',
  async ({ canvas }) => {
    await expectProperties(canvas);
    await expect(canvas.getByText('Ana Ruiz')).toBeVisible();
  },
);

// A phone-wide page draws the same rows above the content, every value in words.
export const PhoneWidthLeadsTheBody = inContainer(
  'h-160 w-90',
  async ({ canvas }) => {
    await expectProperties(canvas);
    await waitFor(() => expect(propertiesPlace(canvas)).toBe('above'));
    await expect(canvas.getByText('Ana Ruiz')).toBeVisible();
  },
);

export const LoadingKeepsProperties: Story = {
  args: { ...issue.detail, isLoading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Loading')).toBeVisible();
    await expect(canvas.queryByText(body)).not.toBeInTheDocument();
    await expectProperties(canvas);
  },
};

// Story args merge with the meta's, so absent props are listed as undefined.
const empty: DetailProps = {
  markdown: undefined,
  children: <EmptyState title="No description" icon="issue" />,
};

export const EmptyContentKeepsProperties: Story = {
  args: empty,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'No description' }),
    ).toBeVisible();
    await expect(canvas.queryByText(body)).not.toBeInTheDocument();
    await expectProperties(canvas);
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

export const WithoutProperties: Story = {
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

type Canvas = Parameters<Play>[0]['canvas'];

type Span = readonly [start: number, end: number];

const crosses = ([aStart, aEnd]: Span, [bStart, bEnd]: Span): boolean =>
  aStart < bEnd && bStart < aEnd;

const overlaps = (a: DOMRect, b: DOMRect): boolean =>
  crosses([a.left, a.right], [b.left, b.right]) &&
  crosses([a.top, a.bottom], [b.top, b.bottom]);

// Waits until an element keeps one box across two frames, so a page still taking its breakpoint is not measured.
async function settled(element: Element): Promise<void> {
  await waitFor(async () => {
    const before = rect(element);

    await nextFrames();

    const after = rect(element);

    await expect(
      sameEdge(before.left, after.left) && sameEdge(before.top, after.top),
    ).toBe(true);
  });
}

// The aside's rows never cover the content, wherever the page puts them.
async function expectAsideClearOfContent(canvas: Canvas): Promise<void> {
  const status = canvas.getByRole('group', { name: statusGroup });

  await settled(status);
  await expect(overlaps(rect(status), rect(canvas.getByText(body)))).toBe(
    false,
  );
}

// A window wide enough for the aside's own column, settled before the story renders; the Screen fills the viewport, as in the App.
const onWidest = (story: Story): Story => ({
  ...story,
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout(1920),
});

export const AsideNeverCoversTheContent: Story = onWidest({
  play: async ({ canvas }) => {
    await expectAsideClearOfContent(canvas);
  },
});

// The App's sidebar takes 384 of a window wide enough to show it, and the rail alone below 1072.
const pageAt = (window: number): number => window - (window >= 1072 ? 384 : 56);

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
      await expectProperties(canvas);

      const edges = [canvas.getByTestId(overflowId)];

      await waitFor(async () => {
        for (const edge of edges)
          await expect(
            edge.scrollWidth,
            `${edge.getAttribute('aria-label') ?? 'page'} is ${edge.scrollWidth} wide in ${edge.clientWidth}`,
          ).toBeLessThanOrEqual(edge.clientWidth);
      });
      await expectAsideClearOfContent(canvas);
    },
  };
}

// The aside's rows never run past their page or over the content, at any window.
export const NothingOverflowsAt375 = pageOfWidth(375);

export const NothingOverflowsAt1024 = pageOfWidth(1024);

export const NothingOverflowsAt1440 = pageOfWidth(1440);

// A phone-wide web window draws the rows above the content.
export const PhoneWindowLeadsTheBody: Story = {
  parameters: { screenPreview: true },
  beforeEach: () => settleLayout('phone'),
  play: async ({ canvas }) => {
    await expectProperties(canvas);
    await waitFor(() => expect(propertiesPlace(canvas)).toBe('above'));
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
    await waitFor(() => expect(propertiesPlace(canvas)).toBe('beside'));
    const status = canvas.getByRole('group', { name: statusGroup });

    await settled(status);
    const scroll = canvas.getByTestId(scrollId);
    const { top } = rect(status);

    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    await expect(sameEdge(rect(status).top, top)).toBe(true);
    await expect(canPointAt(status)).toBe(true);
  },
});
