import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Text } from './text';

const meta = { title: 'Tests/Text', tags: ['!dev'] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const TypographyPreservesHeadingSemantics: Story = {
  render: () => (
    <Text role="title" semanticRole="heading" aria-level={2}>
      Typography heading
    </Text>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Typography heading', level: 2 }),
    ).toBeVisible();
  },
};

export const TypographyDoesNotCreateHeadings: Story = {
  render: () => (
    <>
      <Text role="title">Context usage</Text>
      <Text role={'heading'}>Column label</Text>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Context usage')).toBeVisible();
    await expect(canvas.getByText('Column label')).toBeVisible();
    await expect(canvas.queryAllByRole('heading')).toHaveLength(0);
  },
};
