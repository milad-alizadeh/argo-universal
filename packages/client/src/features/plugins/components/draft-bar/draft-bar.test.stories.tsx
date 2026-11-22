import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement, ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { DraftBar } from './draft-bar';
import { DraftBarDock } from './draft-bar-dock';
import { populatedDraft } from './draft-bar-fixtures';
import { DraftChooseButton } from './draft-choose-button';

function BarFrame({ children }: { children: ReactNode }): ReactElement {
  const { width } = useWindowDimensions();

  return (
    <View className="relative h-96" style={{ width: width - 48 }}>
      {children}
    </View>
  );
}

const meta = {
  title: 'Tests/Plugins/DraftBar',
  component: DraftBar,
  decorators: [
    (Story): React.JSX.Element => (
      <BarFrame>
        <DraftBarDock>
          <Story />
        </DraftBarDock>
      </BarFrame>
    ),
  ],
  args: { ...populatedDraft, onStateChange: fn() },
} satisfies Meta<typeof DraftBar>;

export default meta;

type Story = StoryObj<typeof meta>;

// The State menu opens over the page, outside the story's own canvas.
const menu = (): ReturnType<typeof within> => within(document.body);

export const WideTabsMarkMissingStates: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');

    await expect(
      await canvas.findByRole('button', { name: 'Loading' }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: /Signed out.*missing/ }),
    ).toBeVisible();
  },
};

export const WideTabChoosesItsState: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout('wide');

    await userEvent.click(await canvas.findByRole('button', { name: 'Empty' }));

    await expect(args.onStateChange).toHaveBeenCalledWith('empty');
  },
};

export const WideBarStaysInsideTheWindow: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');

    const bar = (
      await canvas.findByRole('toolbar', { name: 'Draft' })
    ).getBoundingClientRect();

    await expect(bar.left).toBeGreaterThanOrEqual(0);
    await expect(bar.right).toBeLessThanOrEqual(window.innerWidth);
    await expect(bar.bottom).toBeLessThanOrEqual(window.innerHeight);
  },
};

export const PhoneStateMenuMarksMissingStates: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    await expect(canvas.queryByRole('button', { name: 'Loading' })).toBeNull();

    await userEvent.click(await canvas.findByRole('button', { name: 'State' }));
    await settleOverlays();

    const missing = await menu().findByRole('menuitemradio', {
      name: /Signed out/,
    });

    await expect(missing).not.toHaveAttribute('aria-disabled', 'true');
    await expect(missing).toHaveTextContent('missing');
  },
};

export const PhoneStateMenuChoosesAMissingState: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout('phone');

    await userEvent.click(await canvas.findByRole('button', { name: 'State' }));
    await settleOverlays();
    await userEvent.click(
      await menu().findByRole('menuitemradio', { name: /Signed out/ }),
    );

    await expect(args.onStateChange).toHaveBeenCalledWith('signed-out');
  },
};

export const PhoneStateMenuChoosesItsState: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout('phone');

    await userEvent.click(await canvas.findByRole('button', { name: 'State' }));
    await settleOverlays();
    await userEvent.click(
      await menu().findByRole('menuitemradio', { name: 'Error' }),
    );

    await expect(args.onStateChange).toHaveBeenCalledWith('error');
  },
};

export const PhoneStateMenuChecksTheCurrentState: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('phone');

    await userEvent.click(await canvas.findByRole('button', { name: 'State' }));
    await settleOverlays();

    await expect(
      await menu().findByRole('menuitemradio', { name: 'Populated' }),
    ).toBeChecked();
  },
};

export const PhoneBarFitsTheWindowWithComments: Story = {
  args: {
    form: 'menu',
    commentToggle: (
      <IconButton icon="message" accessibilityLabel="Comments" onPress={fn()} />
    ),
    choose: <DraftChooseButton comments={12} onPress={fn()} />,
  },
  play: async ({ canvas }) => {
    await settleLayout('phone');

    const bar = await canvas.findByRole('toolbar', { name: 'Draft' });

    const choose = await canvas.findByRole('button', {
      name: 'Choose · 12 comments',
    });

    const state = await canvas.findByRole('button', { name: 'State' });
    const label = within(state).getByText('Populated');

    await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
    await expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    );
    await expect(choose.getBoundingClientRect().right).toBeLessThan(
      bar.getBoundingClientRect().right,
    );
  },
};
