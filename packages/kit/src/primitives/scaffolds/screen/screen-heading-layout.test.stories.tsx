import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { HeadingLayout } from './screen-heading-layout';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/HeadingLayout',
  component: HeadingLayout,
} satisfies Meta<typeof HeadingLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

const titleId = 'heading-title';

const actionsId = 'heading-actions';

// A column as narrow as a list pane at the largest text size leaves a title beside its buttons.
function example(stacked: boolean): Story {
  return {
    args: {
      stacked,
      title: (
        <View testID={titleId}>
          <Text role="title">Sessions</Text>
        </View>
      ),
      actions: <View testID={actionsId} style={{ width: 80, height: 32 }} />,
    },
    render: (args) => (
      <View style={{ width: 240 }}>
        <HeadingLayout {...args} />
      </View>
    ),
  };
}

const box = (element: HTMLElement): DOMRect => element.getBoundingClientRect();

export const StackedSitsBelowTheTitle: Story = {
  ...example(true),
  play: async ({ canvas }) => {
    const actions = await canvas.findByTestId(actionsId);

    await expect(box(actions).top).toBeGreaterThanOrEqual(
      box(await canvas.findByTestId(titleId)).bottom,
    );
  },
};

export const InlineSharesTheTitleRow: Story = {
  ...example(false),
  play: async ({ canvas }) => {
    const actions = await canvas.findByTestId(actionsId);
    const title = box(await canvas.findByTestId(titleId));

    await expect(box(actions).top).toBeLessThan(title.bottom);
    await expect(box(actions).left).toBeGreaterThanOrEqual(title.right);
  },
};
