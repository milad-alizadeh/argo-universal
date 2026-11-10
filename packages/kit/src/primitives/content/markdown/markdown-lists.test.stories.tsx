import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { type LayoutName, settleLayout } from '#mocks/story-layout';
import { canPointAt } from '../../../../mocks/point-hit';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Markdown/Lists',
  component: Markdown,
  args: { text: '' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

const afterBlock = 'Text after the block';

const lastCode = 'lastValue';

const lastColumn = 'Last column';

const wideValues = Array.from(
  { length: 24 },
  (_, index) => `'item ${index}'`,
).join(', ');

const wideCode = `1. First item\n\n    \`\`\`ts\n    const value = [${wideValues}, ${lastCode}];\n    \`\`\`\n\n    ${afterBlock}\n2. Second item`;

const wideTable = `1. First item\n\n    | Component | Platform | Status | Owner | Updated | Coverage | Notes |\n    | --- | --- | --- | --- | --- | --- | --- |\n    | Table primitive row | iOS and Android both | Waiting on review | Design systems team | Three days ago | Partially covered | ${lastColumn} |\n\n    ${afterBlock}\n2. Second item`;

// A column sized to its content up to a cap, as a message bubble is, rather than one stretched across its parent.
function ContentSized({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="w-full items-end">
      <View className="max-w-7/10">{children}</View>
    </View>
  );
}

const contentSized = (Story: () => React.JSX.Element): React.JSX.Element => (
  <ContentSized>
    <Story />
  </ContentSized>
);

// A column stretched across its parent, as an Agent message is.
const stretched = (Story: () => React.JSX.Element): React.JSX.Element => (
  <View className="w-full">
    <Story />
  </View>
);

function horizontalScroller(element: HTMLElement | null): HTMLElement {
  if (!element) throw new Error('Expected the block to scroll');

  if (getComputedStyle(element).overflowX === 'auto') return element;

  return horizontalScroller(element.parentElement);
}

// A wide block inside a list item scrolls within the item, so the item's text stays on screen and its end is reachable.
function scrollsInItem(text: string, last: string, layout: LayoutName): Story {
  return {
    args: { text },
    play: async ({ canvas }) => {
      await settleLayout(layout);
      await waitFor(() =>
        expect(canPointAt(canvas.getByText(afterBlock))).toBe(true),
      );
      const end = canvas.getByText(last, { exact: false });
      const scroller = horizontalScroller(end);
      scroller.scrollLeft = scroller.scrollWidth;
      await waitFor(() => expect(canPointAt(end)).toBe(true));
    },
  };
}

export const WideCodeScrollsInItemPhone: Story = {
  ...scrollsInItem(wideCode, lastCode, 'phone'),
  decorators: [stretched],
};

export const WideCodeScrollsInItemWide: Story = {
  ...scrollsInItem(wideCode, lastCode, 'wide'),
  decorators: [stretched],
};

export const WideTableScrollsInItemPhone: Story = {
  ...scrollsInItem(wideTable, lastColumn, 'phone'),
  decorators: [stretched],
};

export const WideTableScrollsInItemWide: Story = {
  ...scrollsInItem(wideTable, lastColumn, 'wide'),
  decorators: [stretched],
};

export const WideCodeScrollsInContentSizedItemPhone: Story = {
  ...scrollsInItem(wideCode, lastCode, 'phone'),
  decorators: [contentSized],
};

export const WideCodeScrollsInContentSizedItemWide: Story = {
  ...scrollsInItem(wideCode, lastCode, 'wide'),
  decorators: [contentSized],
};

// A table in a content-sized column on a phone is left out: at that width the Table's pinned first column covers its scrolled columns whether or not it sits in a list.
export const WideTableScrollsInContentSizedItemWide: Story = {
  ...scrollsInItem(wideTable, lastColumn, 'wide'),
  decorators: [contentSized],
};
