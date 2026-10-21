import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { type MockInstance, expect, spyOn, waitFor } from 'storybook/test';
import { fadedEdges, fadedInlineEdges } from '../../../../mocks/scroll-fade';
import { ScrollFadeView } from './scroll-fade';
import {
  ScrollFadePreview,
  ScrollFadeRowPreview,
} from './scroll-fade-preview.mocks';

const meta = {
  title: 'Tests/ScrollFade',
  component: ScrollFadeView,
} satisfies Meta<typeof ScrollFadeView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FadesFollowScroll: Story = {
  render: () => <ScrollFadePreview />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('scroll-fade-scroll');
    // At rest only the bottom edge hides content.
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: false, bottom: true }),
    );
    scroll.scrollTop = 120;
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: true, bottom: true }),
    );
    // The faded content lies below the header, never over it.
    await expect(scroll.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      canvas.getByText('pnpm dev').getBoundingClientRect().bottom,
    );
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: true, bottom: false }),
    );
    scroll.scrollTop = 0;
    await waitFor(() =>
      expect(fadedEdges(scroll)).toEqual({ top: false, bottom: true }),
    );
  },
};

export const NoFadeWhenContentFits: Story = {
  render: () => <ScrollFadePreview lines={['Starting Metro Bundler']} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Starting Metro Bundler');
    const scroll = canvas.getByTestId('scroll-fade-scroll');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(fadedEdges(scroll)).toEqual({ top: false, bottom: false });
  },
};

export const HorizontalFadesFollowScroll: Story = {
  render: () => <ScrollFadeRowPreview />,
  play: async ({ canvas }) => {
    const row = await canvas.findByTestId('scroll-fade-row');
    // At rest only the trailing edge hides content.
    await waitFor(() =>
      expect(fadedInlineEdges(row)).toEqual({ leading: false, trailing: true }),
    );
    row.scrollLeft = 40;
    await waitFor(() =>
      expect(fadedInlineEdges(row)).toEqual({ leading: true, trailing: true }),
    );
    row.scrollLeft = row.scrollWidth;
    await waitFor(() =>
      expect(fadedInlineEdges(row)).toEqual({ leading: true, trailing: false }),
    );
    // The row is no taller than its content: the vertical fade's end gap never pads it.
    await expect(row.scrollHeight).toBe(row.clientHeight);
  },
};

export const NoHorizontalFadeWhenRowFits: Story = {
  render: () => <ScrollFadeRowPreview labels={['All']} />,
  play: async ({ canvas }) => {
    await canvas.findByText('All');
    const row = canvas.getByTestId('scroll-fade-row');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(fadedInlineEdges(row)).toEqual({
      leading: false,
      trailing: false,
    });
  },
};

// Scroll view props only native lists take; a web list that passes them to its DOM element makes React warn of unknown attributes.
const nativeOnlyProps = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  nestedScrollEnabled: true,
  contentInsetAdjustmentBehavior: 'automatic',
} as const;

const rows = ['First row', 'Second row', 'Third row'];

const listFrame = { height: 200 };

let consoleErrors: MockInstance<typeof console.error>;

const nativeOnlyPropWarnings = (): unknown[] =>
  consoleErrors.mock.calls
    .flat()
    .filter(
      (part) =>
        typeof part === 'string' &&
        Object.keys(nativeOnlyProps).some((name) => part.includes(name)),
    );

export const ListKeepsNativeOnlyPropsOffTheWeb: Story = {
  beforeEach: () => {
    consoleErrors = spyOn(console, 'error');

    return (): void => consoleErrors.mockRestore();
  },
  render: () => (
    <View style={listFrame}>
      <List
        {...nativeOnlyProps}
        items={rows}
        keyExtractor={(row) => row}
        renderItem={(item) => <Text>{item}</Text>}
      />
    </View>
  ),
  play: async ({ canvas }) => {
    await canvas.findByText('Third row');
    await expect(nativeOnlyPropWarnings()).toEqual([]);
  },
};
