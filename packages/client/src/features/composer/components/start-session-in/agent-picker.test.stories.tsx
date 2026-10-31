import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within, waitFor } from 'storybook/test';
import { ComposerAgentModelControl } from '../composer-configuration/composer-configuration';

const agents = newSessionCatalogs.bothAvailable;

const onAgentChange = fn();

const agentAndModel = 'Agent and model';

const onAddAgents = fn();

// Whether the Agent and model sheet was still on screen each time the Agents page was asked for.
const sheetOpenWhenAsked: boolean[] = [];

const meta = {
  title: 'Tests/Composer/StartSessionIn/AgentPicker',
  component: ComposerAgentModelControl,
  args: {
    disabled: false,
    configuration: {
      agent: agents[0],
      configOptions: [],
      onConfigChange: fn(),
      checkout: { branch: 'main', newWorktree: false },
      agentChoices: { agents, onChange: onAgentChange, onAdd: onAddAgents },
    },
  },
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

function selectAgent(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ canvas, userEvent }) => {
      const first = agents[0],
        second = agents[1];

      if (!first || !second) throw new Error('Picker fixture needs two Agents');
      await userEvent.click(
        canvas.getByRole('button', { name: agentAndModel }),
      );
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', { name: /^Agent,/ }),
      );
      await waitFor(() =>
        expect(
          overlay.getByRole('radio', { name: first.name }),
        ).toHaveAttribute('aria-checked', 'true'),
      );
      await userEvent.click(overlay.getByRole('radio', { name: second.name }));
      await waitFor(() =>
        expect(onAgentChange).toHaveBeenCalledWith(second.id),
      );
      await waitFor(() =>
        expect(overlay.getByRole('button', { name: /^Agent,/ })).toBeVisible(),
      );
    },
  };
}

function addAgents(width: number): Story {
  return {
    args: {
      configuration: {
        ...meta.args.configuration,
        agent: undefined,
        agentChoices: {
          agents: [],
          onChange: onAgentChange,
          onAdd: onAddAgents,
        },
      },
    },
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ canvas, userEvent }) => {
      const trigger = canvas.getByRole('button', { name: agentAndModel });
      await expect(trigger).toHaveTextContent('Choose Agent');
      await userEvent.click(trigger);
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', { name: /^Agent,/ }),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: 'Add Agents' }),
      );
      await waitFor(() => expect(onAddAgents).toHaveBeenCalledOnce());
    },
  };
}

export const SelectWide = selectAgent(layoutWidths.wide);

export const SelectPhone = selectAgent(layoutWidths.phone);

export const AddWithZeroAgentsWide = addAgents(layoutWidths.wide);

export const AddWithZeroAgentsPhone = addAgents(layoutWidths.phone);

/*
 * The Agents page opens once the sheet has closed, not while it is still presented: SwiftUI's sheet sits over the
 * screen, and a route that mounts under it for the first time never shows (#1738). What a story can see of that is
 * the order, so the sheet is read at the moment the Agents page is asked for.
 */
export const AddOpensTheAgentsPageAfterTheSheetCloses: Story = {
  args: {
    configuration: {
      ...meta.args.configuration,
      agent: undefined,
      agentChoices: {
        agents: [],
        onChange: onAgentChange,
        onAdd: () => {
          sheetOpenWhenAsked.push(
            within(document.body).queryByRole('dialog', {
              name: agentAndModel,
            }) !== null,
          );
        },
      },
    },
  },
  beforeEach: async (): Promise<void> => {
    sheetOpenWhenAsked.length = 0;
    await settleLayout(layoutWidths.phone);
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: agentAndModel }));
    const overlay = within(document.body);
    await userEvent.click(
      await overlay.findByRole('button', { name: /^Agent,/ }),
    );
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Add Agents' }),
    );
    await waitFor(() => expect(sheetOpenWhenAsked).toHaveLength(1));
    await expect(sheetOpenWhenAsked).toEqual([false]);
  },
};
