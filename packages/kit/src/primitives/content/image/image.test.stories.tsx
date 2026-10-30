import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { MediaUrlContext } from '#primitives/content/media-url';
import { Image } from './image';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Image',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const asset = {
  pluginId: 'example',
  hash: 'a'.repeat(64),
  format: 'jpeg',
} as const;

export const Loading: Story = {
  render: () => <Image accessibilityLabel="Loading preview" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('img', { name: 'Loading preview' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('progressbar')).toBeNull();
  },
};

function ReloadingImage(): React.JSX.Element {
  const [missing, setMissing] = useState(true);

  return (
    <>
      <Button label="Load picture" onPress={() => setMissing(false)} />
      <MediaUrlContext
        value={
          missing
            ? () => 'data:image/png;base64,broken'
            : () =>
                'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        }
      >
        <Image source={asset} accessibilityLabel="Preview" />
      </MediaUrlContext>
    </>
  );
}

export const RecoversWhenSourceChanges: Story = {
  render: () => <ReloadingImage />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Preview, image unavailable' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Load picture' }));
    await expect(
      await canvas.findByRole('img', { name: 'Preview' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('img', { name: 'Preview, image unavailable' }),
    ).toBeNull();
  },
};
