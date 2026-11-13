import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, userEvent } from 'storybook/test';
import {
  AgentDetailView,
  environmentFooter,
  newLinePlaceholder,
} from './agent-detail-view';
import { agentWithEnvironment } from './agent-detail-view-fixtures';

const savedEnvironment = agentWithEnvironment.env;

// Expo UI's TextInput has no label, so a line is found by its text.
const proxyLine = `HTTPS_PROXY=${savedEnvironment.HTTPS_PROXY}`;

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

// Replaces a line's text and leaves the field, as a person tabbing away does.
async function rewrite(line: HTMLElement, text: string): Promise<void> {
  await userEvent.clear(line);

  if (text !== '') await userEvent.type(line, text);

  line.blur();
}

export const EachVariableIsALine: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Claude Agent', level: 1 }),
    ).toBeVisible();

    for (const [name, value] of Object.entries(savedEnvironment))
      await expect(canvas.getByDisplayValue(`${name}=${value}`)).toBeVisible();

    await expect(canvas.getByDisplayValue('')).toBeVisible();
    await expect(canvas.getByText(environmentFooter)).toBeVisible();
  },
};

export const AChangedLineSavesTheWholeEnvironment: Story = {
  play: async ({ args, canvas }) => {
    const line = canvas.getByDisplayValue(proxyLine);

    await rewrite(line, 'HTTPS_PROXY=http://localhost:3128');
    await expect(args.onEnvironmentChange).toHaveBeenCalledWith({
      ...savedEnvironment,
      HTTPS_PROXY: 'http://localhost:3128',
    });
  },
};

export const AnUnchangedLineSavesNothing: Story = {
  play: async ({ args, canvas }) => {
    const line = canvas.getByDisplayValue(proxyLine);

    await userEvent.click(line);
    line.blur();
    await expect(args.onEnvironmentChange).not.toHaveBeenCalled();
  },
};

export const AnEmptiedLineRemovesItsVariable: Story = {
  play: async ({ args, canvas }) => {
    await rewrite(canvas.getByDisplayValue(proxyLine), '');
    await expect(args.onEnvironmentChange).toHaveBeenCalledWith({
      CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
    });
  },
};

export const TheEmptyLastLineAddsAVariable: Story = {
  play: async ({ args, canvas }) => {
    await rewrite(canvas.getByDisplayValue(''), 'NO_COLOR=1');
    await expect(args.onEnvironmentChange).toHaveBeenCalledWith({
      ...savedEnvironment,
      NO_COLOR: '1',
    });
  },
};

export const ALineTheEnvironmentCannotTakeSaysWhy: Story = {
  play: async ({ args, canvas }) => {
    await rewrite(canvas.getByDisplayValue(proxyLine), 'NOT A VARIABLE');
    await expect(args.onEnvironmentChange).not.toHaveBeenCalled();
    await expect(canvas.queryByText(environmentFooter)).toBeNull();
    await expect(canvas.getByText(/NAME=value/)).toBeVisible();
  },
};

export const AMissingAgentSaysSo: Story = {
  args: { title: 'old-agent', agent: { status: 'missing' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/no Installed Agent named old-agent/),
    ).toBeVisible();
    await expect(canvas.queryByPlaceholderText(newLinePlaceholder)).toBeNull();
  },
};
