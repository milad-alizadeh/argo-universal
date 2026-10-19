import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { agentRow as agent } from '../registry-icons.mocks';
import { AgentListItem } from './agent-list-item';

const meta = {
  title: 'Tests/AgentCardActions',
  component: AgentListItem,
  args: { agent, onInstall: fn(), onRemove: fn() },
} satisfies Meta<typeof AgentListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

const actionName = (label: string): string => `${label} ${agent.name}`;

// One action per state: Install before the Agent is added, Remove after.
function action(width: number, installed: boolean): Story {
  const [label, other] = installed
    ? ['Remove', 'Install']
    : ['Install', 'Remove'];

  return {
    args: { agent: { ...agent, installed } },
    play: async ({ args, canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        canvas.queryByRole('button', { name: actionName(other) }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        canvas.getByRole('button', { name: actionName(label) }),
      );
      await expect(
        installed ? args.onRemove : args.onInstall,
      ).toHaveBeenCalledWith(agent.id);
    },
  };
}

export const InstallsPhone = action(layoutWidths.phone, false);

export const InstallsWide = action(layoutWidths.wide, false);

export const RemovesPhone = action(layoutWidths.phone, true);

export const RemovesWide = action(layoutWidths.wide, true);

// The meta line links the repository and the website only, never the licence (owner, 2026-10-19).
function links(width: number): Story {
  return {
    args: {
      agent: {
        ...agent,
        repository: 'https://example.org/repository',
        website: 'https://example.org/website',
      },
    },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('button', { name: 'Repository' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Website' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: /License/ }),
      ).not.toBeInTheDocument();
    },
  };
}

export const LinksPhone = links(layoutWidths.phone);

export const LinksWide = links(layoutWidths.wide);

const unsupported = 'Not supported on this platform';

const unavailableAgent = { agent: { ...agent, unavailable: true } };

const anyAction = /^(Install|Remove) /;

// A phone shows a status icon whose label says why, and no action.
export const UnavailablePhone: Story = {
  args: unavailableAgent,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    await expect(canvas.getByLabelText(unsupported)).toBeVisible();
    await expect(canvas.queryByText('Unavailable')).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: anyAction }),
    ).not.toBeInTheDocument();
  },
};

// Desktop names the status in words and says why on the meta line, with no action.
export const UnavailableWide: Story = {
  args: unavailableAgent,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(canvas.getByText('Unavailable')).toBeVisible();
    await expect(canvas.getByText(unsupported)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: anyAction }),
    ).not.toBeInTheDocument();
  },
};
