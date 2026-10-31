import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within, waitFor } from 'storybook/test';
import { ComposerAgentModelControl } from '../composer-configuration/composer-configuration';

const agents = newSessionCatalogs.bothAvailable;

const onAgentChange = fn();

const onAddAgents = fn();

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
        canvas.getByRole('button', { name: 'Agent and model' }),
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
      const trigger = canvas.getByRole('button', { name: 'Agent and model' });
      await expect(trigger).toHaveTextContent('Choose Agent');
      await userEvent.click(trigger);
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', { name: /^Agent,/ }),
      );
      // There is no search here, so the page says what is missing and how to add it.
      await expect(await overlay.findByRole('status')).toHaveTextContent(
        /Add Agents/u,
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
