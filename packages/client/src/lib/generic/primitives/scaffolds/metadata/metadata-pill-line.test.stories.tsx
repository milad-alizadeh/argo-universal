import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { within, expect } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { MetadataPillLine } from './metadata-pill-line';

const meta = {
  title: 'Tests/Metadata/Pill line',
  component: MetadataPillLine,
  args: { pills: [{ text: 'iOS' }, { text: 'Android' }, { text: 'Web' }] },
} satisfies Meta<typeof MetadataPillLine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RefitsWithoutLosingTheCount: Story = {
  render: function Render(args) {
    const [width, setWidth] = useState(100);
    const [retinted, setRetinted] = useState(false);

    return (
      <>
        <View style={{ width }}>
          <MetadataPillLine
            pills={
              retinted
                ? args.pills.map((pill) => ({ ...pill, tone: 'info' }))
                : args.pills
            }
          />
        </View>
        <Button
          label={retinted ? 'Tone updated' : 'Retint'}
          onPress={() => setRetinted(true)}
        />
        <Button label="Widen" onPress={() => setWidth(500)} />
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const line = within(canvas.getByTestId('metadata-visible-pills'));
    await expect(await line.findByText('+2', { exact: true })).toBeVisible();
    await expect(line.getByText('iOS', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retint' }));
    await expect(
      canvas.getByRole('button', { name: 'Tone updated' }),
    ).toBeVisible();
    await expect(await line.findByText('+2', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Widen' }));
    await expect(
      await line.findByText('Android', { exact: true }),
    ).toBeVisible();
    await expect(line.getByText('Web', { exact: true })).toBeVisible();
    await expect(
      line.queryByText('+2', { exact: true }),
    ).not.toBeInTheDocument();
  },
};
