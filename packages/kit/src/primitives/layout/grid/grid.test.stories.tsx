import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { settleViewport } from '#kit/settle-viewport';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Grid } from './grid';

const meta = { title: 'Tests/Grid' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Counter(): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Button label={`Count ${count}`} onPress={() => setCount(count + 1)} />
  );
}

export const ReflowPreservesChildState: Story = {
  render: () => (
    <Grid columns={{ compact: 1, wide: 4 }} gap={3}>
      <Counter />
      <Text>Second item</Text>
      <Text>Third item</Text>
      <Text>Final item</Text>
    </Grid>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(1440);
    await userEvent.click(canvas.getByRole('button', { name: 'Count 0' }));
    await expect(canvas.getByRole('button', { name: 'Count 1' })).toBeVisible();
    await settleViewport(390);
    await expect(canvas.getByRole('button', { name: 'Count 1' })).toBeVisible();
    await expect(canvas.getByText('Final item')).toBeVisible();
  },
};
