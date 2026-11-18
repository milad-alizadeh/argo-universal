import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { expect, waitFor, within } from 'storybook/test';
import { settleOverlays } from '#mocks/settle-overlays';
import { settleLayout } from '#mocks/story-layout';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { ContextMenu, Menu } from '#primitives/overlays/menu';
import type { TriggerElement } from '#primitives/overlays/open-state';
import { Tooltip } from '#primitives/overlays/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Popover/OneOpen',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = Parameters<NonNullable<Story['play']>>[0];

// The element a trigger draws, which the overlay's own handlers are added to.
const button = (label: string): NonNullable<TriggerElement> => (
  <Pressable
    role="button"
    className={contentActionClass({ variant: 'outline' })}
  >
    <Text>{label}</Text>
  </Pressable>
);

type PanelProps = {
  label: string;
  name: string;
  hover?: boolean;
  children?: ReactNode;
};

// A popover named for its trigger, opened by a press or, with `hover`, by the pointer.
function Panel({ label, name, hover, children }: PanelProps): ReactElement {
  return (
    <Popover openOnHover={hover}>
      <PopoverTrigger>{button(label)}</PopoverTrigger>
      <PopoverContent accessibilityLabel={name}>
        <Text>{name}</Text>
        {children}
      </PopoverContent>
    </Popover>
  );
}

const page = within(document.body);

const panel = (name: string): HTMLElement | null =>
  page.queryByRole('dialog', { name });

const gone = (name: string): Promise<void> =>
  waitFor(() => expect(panel(name)).not.toBeInTheDocument());

async function openAgents({ canvas, userEvent }: Play): Promise<void> {
  await settleLayout('wide');
  await userEvent.click(canvas.getByRole('button', { name: 'Agent' }));
  await page.findByRole('dialog', { name: 'Agents' });
  await settleOverlays();
}

// A popover the pointer opens is no press outside the one already open, and still takes its place.
export const HoveringAnotherOpenClosesTheFirstWide: Story = {
  render: () => (
    <View className="flex-row gap-4">
      <Panel label="Agent" name="Agents" />
      <Panel label="Checks" name="CI Checks" hover />
    </View>
  ),
  play: async (context) => {
    await openAgents(context);
    await context.userEvent.hover(
      context.canvas.getByRole('button', { name: 'Checks' }),
    );
    await page.findByRole('dialog', { name: 'CI Checks' });
    await gone('Agents');
  },
};

// A right-click on a row whose hover popover is open leaves the context menu alone on the page, as a Change row does.
export const ContextMenuClosesTheHoverPopoverWide: Story = {
  render: () => (
    <ContextMenu groups={[[{ label: 'Copy link', onPress: action('copy') }]]}>
      <View className="flex-row gap-4">
        <Panel label="Checks" name="CI Checks" hover />
      </View>
    </ContextMenu>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const checks = canvas.getByRole('button', { name: 'Checks' });

    await userEvent.hover(checks);
    await page.findByRole('dialog', { name: 'CI Checks' });
    await userEvent.pointer({ keys: '[MouseRight]', target: checks });
    await page.findByRole('menu');
    await gone('CI Checks');
  },
};

// A menu opened beside an open popover takes its place.
export const MenuClosesThePopoverBesideItWide: Story = {
  render: () => (
    <View className="flex-row gap-4">
      <Panel label="Checks" name="CI Checks" hover />
      <Menu
        accessibilityLabel="Actions"
        actions={[{ label: 'Copy link', onPress: action('copy') }]}
        trigger={button('More')}
      />
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.hover(canvas.getByRole('button', { name: 'Checks' }));
    await page.findByRole('dialog', { name: 'CI Checks' });
    canvas.getByRole('button', { name: 'Actions' }).focus();
    await userEvent.keyboard('{Enter}');
    await page.findByRole('menu');
    await gone('CI Checks');
  },
};

// A popover opened from another's content belongs with it: both stay open.
export const PopoverOpenedInsideAnotherKeepsItOpenWide: Story = {
  render: () => (
    <Panel label="Agent" name="Agents">
      <Panel label="Model" name="Models" />
    </Panel>
  ),
  play: async (context) => {
    await openAgents(context);
    await context.userEvent.click(page.getByRole('button', { name: 'Model' }));
    await page.findByRole('dialog', { name: 'Models' });
    await settleOverlays();
    await expect(panel('Agents')).toBeInTheDocument();
  },
};

// A tooltip names what the pointer is on and closes nothing.
export const TooltipLeavesThePopoverOpenWide: Story = {
  render: () => (
    <View className="flex-row gap-4">
      <Panel label="Agent" name="Agents" />
      <Tooltip label="Attach a file">{button('Attach')}</Tooltip>
    </View>
  ),
  play: async (context) => {
    await openAgents(context);
    await context.userEvent.hover(
      context.canvas.getByRole('button', { name: 'Attach' }),
    );
    await page.findByRole('tooltip');
    await expect(panel('Agents')).toBeInTheDocument();
  },
};
