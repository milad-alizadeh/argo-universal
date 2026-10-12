import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentListView } from '../agent-list-view/agent-list-view';
import {
  agentLink,
  agentListArgs,
  installedAgents,
} from '../agent-list-view/agent-list-view.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agents phone header',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
} satisfies Meta<typeof AgentListView>;
export default meta;
type Story = StoryObj<typeof meta>;

const searchLabel = 'Search Agents';
const [firstName = '', secondName = '', thirdName = ''] = installedAgents.map(
  ({ name }) => name,
);

export const PhoneHeaderFiltersAndAddsACustomAgent: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Filter Agents' }),
    );
    await userEvent.click(
      await page.findByRole('menuitemradio', { name: 'Not installed' }),
    );
    await expect(
      canvas.queryByRole('link', { name: agentLink(firstName) }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Filter Agents' }),
    );
    await expect(
      await page.findByRole('menuitemradio', { name: 'Not installed' }),
    ).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(page.queryByRole('menu')).not.toBeInTheDocument(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Add custom Agent' }),
    );
    await expect(args.onAddCustomAgent).toHaveBeenCalledOnce();
  },
};

export const PhoneSearchesInTheHeader: Story = {
  play: async ({ canvas, userEvent }) => {
    const labels = canvas
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    await expect(labels.indexOf(searchLabel)).toBe(
      labels.indexOf('Add custom Agent') + 1,
    );
    await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: searchLabel }),
      'third',
    );
    await expect(
      canvas.getByRole('link', { name: agentLink(thirdName) }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('link', { name: agentLink(secondName) }),
    ).not.toBeInTheDocument();
  },
};
