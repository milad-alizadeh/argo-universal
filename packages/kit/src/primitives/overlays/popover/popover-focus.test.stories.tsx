import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { expect, waitFor, within } from 'storybook/test';
import { settleOverlays } from '#mocks/settle-overlays';
import { settleLayout } from '#mocks/story-layout';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from './popover';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Popover/Focus',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Trigger({ label }: { label: string }): React.JSX.Element {
  return (
    <PopoverTrigger>
      <Pressable
        role="button"
        className={contentActionClass({ variant: 'outline' })}
      >
        <Text>{label}</Text>
      </Pressable>
    </PopoverTrigger>
  );
}

function ClosingRow(): React.JSX.Element {
  return <ListItem title="Claude" onPress={usePopoverClose()} />;
}

// Two controls side by side, as New Session's Agent and Checkout.
function TwoPopovers(): React.JSX.Element {
  return (
    <>
      <Popover>
        <Trigger label="Agent" />
        <PopoverContent accessibilityLabel="Agents" className="p-1">
          <List>
            <ClosingRow />
          </List>
        </PopoverContent>
      </Popover>
      <Popover>
        <Trigger label="Checkout" />
        <PopoverContent accessibilityLabel="Checkouts" className="p-1">
          <List>
            <ListItem title="Local" onPress={action('local')} />
          </List>
        </PopoverContent>
      </Popover>
    </>
  );
}

// A popover still fading out leaves focus in the one opened meanwhile, so that one stays open.
export const OpeningAnotherWhileOneClosesKeepsItOpenWide: Story = {
  render: () => <TwoPopovers />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const page = within(document.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Agent' }));
    const agents = await page.findByRole('dialog', { name: 'Agents' });
    await userEvent.click(
      within(agents).getByRole('button', { name: 'Claude' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => expect(agents).not.toBeInTheDocument());
    // Radix returns focus a task after the content leaves the page.
    await new Promise((settle) => setTimeout(settle, 50));
    /*
     * The Checkouts popover fades in from transparent, so it shows once its entrance has run. The
     * browser's own animation clock ends that, not a timer here: a runner too busy to draw frames
     * for a second left it at opacity 0 and failed a one-second wait on a popover that was open.
     */
    const checkouts = await page.findByRole('dialog', { name: 'Checkouts' });
    await settleOverlays();
    await expect(checkouts).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Agent' }),
    ).not.toHaveFocus();
  },
};
