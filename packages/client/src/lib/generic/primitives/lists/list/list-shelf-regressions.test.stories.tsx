import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { ListItem } from '#primitives/lists/list-item';
import { Page } from '#primitives/scaffolds/page';
import { List } from './list';

const meta = {
  title: 'Tests/List shelf regressions',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Counter(): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <ListItem title={`Counter ${count}`} onPress={() => setCount(count + 1)} />
  );
}

function PrependLooseItem(): React.JSX.Element {
  const [added, setAdded] = useState(false);

  return (
    <>
      <ListItem title="Toggle first tile" onPress={() => setAdded(!added)} />
      <List direction="horizontal">
        {added && <ListItem key="new" title="New tile" />}
        <Counter key="counter" />
        <List.Section key="section" title="Section">
          <ListItem title="Other" />
        </List.Section>
      </List>
    </>
  );
}

export const LooseKeysPreserveState: Story = {
  render: () => <PrependLooseItem />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Counter 0' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Counter 1' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle first tile' }),
    );
    await canvas.findByText('New tile');
    await expect(
      canvas.getByRole('button', { name: 'Counter 1' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle first tile' }),
    );
    await expect(canvas.queryByText('New tile')).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Counter 1' }),
    ).toBeVisible();
  },
};

export const ManyShelves: Story = {
  render: () => (
    <View style={{ height: 500 }}>
      <Page title="Gallery">
        <List
          testID="section-scroll"
          direction="horizontal"
          footer="End of shelves"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <List.Section key={i} title={`Section ${i}`}>
              <ListItem title={`Tile ${i}`} />
            </List.Section>
          ))}
        </List>
      </Page>
    </View>
  ),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('section-scroll');
    await canvas.findByText('Tile 0');
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      await expect(await canvas.findByText('Tile 9')).toBeVisible();
      await expect(await canvas.findByText('End of shelves')).toBeVisible();
      await expect(scroll.scrollTop).toBeGreaterThan(0);
    });
  },
};
