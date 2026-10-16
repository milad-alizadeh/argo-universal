import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { AgentListView } from './agent-list-view';
import { agentListArgs } from './agent-list-view.mocks';

const meta = {
  title: 'Tests/Agents phone header',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
} satisfies Meta<typeof AgentListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Searches: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Add custom Agent' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Search Agents' }),
    );
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Search Agents' }),
      'Python',
    );
    await expect(
      canvas.getByRole('group', { name: /^Python Agent, v/ }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: /^Example Agent, v/ }),
    ).not.toBeInTheDocument();
  },
};
