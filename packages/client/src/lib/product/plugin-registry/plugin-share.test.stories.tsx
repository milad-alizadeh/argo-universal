import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const share = fn<(data: ShareData) => Promise<void>>();

const onEvent = fn();

let answer: PromiseWithResolvers<void>;

// The browser's OS share port is the only replaced boundary; the registry and RN Web Share run for real.
function sharePort(): () => void {
  const previous = Object.getOwnPropertyDescriptor(navigator, 'share');
  answer = Promise.withResolvers<void>();
  share.mockImplementation(() => answer.promise);
  Object.defineProperty(navigator, 'share', {
    value: share,
    configurable: true,
  });

  return () => {
    answer.resolve();

    if (previous) Object.defineProperty(navigator, 'share', previous);
    else Reflect.deleteProperty(navigator, 'share');
  };
}

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Share',
  beforeEach: sharePort,
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AppShare: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Share content' });
    await userEvent.click(button);
    await expect(share).toHaveBeenCalledWith({
      title: 'Argo',
      text: 'Shared from a Plugin',
      url: undefined,
    });
    await expect(onEvent).not.toHaveBeenCalled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    answer.resolve();
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'));
  },
};
