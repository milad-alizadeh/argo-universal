import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { AgentDetailView, removeLabel } from './agent-detail-view';
import { agentWithEnvironment } from './agent-detail-view-fixtures';
import {
  addLabel,
  environmentFooter,
  namePlaceholder,
  valuePlaceholder,
} from './agent-new-variable';

const savedEnvironment = agentWithEnvironment.env;

// Expo UI's TextInput has no label, so a field is found by its value or its placeholder.
const savedProxy = savedEnvironment.HTTPS_PROXY;

const meta = {
  title: 'Tests/Screens/Settings/Agent',
  component: AgentDetailView,
  parameters: { screenPreview: true },
  args: {
    title: 'Claude Agent',
    agent: agentWithEnvironment,
    onEnvironmentChange: fn(),
    onBack: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EachVariableIsASection: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Claude Agent', level: 1 }),
    ).toBeVisible();

    for (const [name, value] of Object.entries(savedEnvironment)) {
      await expect(canvas.getByText(name)).toBeVisible();
      await expect(canvas.getByDisplayValue(value)).toBeVisible();
    }

    await expect(canvas.getByText(environmentFooter)).toBeVisible();
  },
};

export const AChangedValueSavesTheWholeEnvironment: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const proxy = canvas.getByDisplayValue(savedProxy);

    await userEvent.clear(proxy);
    await userEvent.type(proxy, 'http://localhost:3128');
    await expect(args.onEnvironmentChange).not.toHaveBeenCalled();
    proxy.blur();
    await expect(args.onEnvironmentChange).toHaveBeenCalledWith({
      ...savedEnvironment,
      HTTPS_PROXY: 'http://localhost:3128',
    });
  },
};

export const RemoveDropsOnlyThatVariable: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: removeLabel('HTTPS_PROXY') }),
    );
    await expect(args.onEnvironmentChange).toHaveBeenCalledWith({
      CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
    });
  },
};

export const AddAppendsANamedVariable: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const add = canvas.getByRole('button', { name: addLabel });

    await expect(add).toBeDisabled();
    await userEvent.type(
      canvas.getByPlaceholderText(namePlaceholder),
      'NO_COLOR',
    );
    await userEvent.type(canvas.getByPlaceholderText(valuePlaceholder), '1');
    await userEvent.click(add);
    await expect(args.onEnvironmentChange).toHaveBeenCalledWith({
      ...savedEnvironment,
      NO_COLOR: '1',
    });
  },
};

export const ASavedNameCannotBeAddedAgain: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByPlaceholderText(namePlaceholder),
      'HTTPS_PROXY',
    );
    await expect(canvas.getByRole('button', { name: addLabel })).toBeDisabled();
    await expect(args.onEnvironmentChange).not.toHaveBeenCalled();
  },
};

export const ANameWithASpaceCannotBeAdded: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByPlaceholderText(namePlaceholder),
      'NO COLOR',
    );
    await expect(canvas.getByRole('button', { name: addLabel })).toBeDisabled();
  },
};

export const AMissingAgentSaysSo: Story = {
  args: { title: 'old-agent', agent: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/no Installed Agent named old-agent/),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: addLabel })).toBeNull();
  },
};
