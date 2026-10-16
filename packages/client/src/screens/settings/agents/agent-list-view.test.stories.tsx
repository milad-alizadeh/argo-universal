import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import type { AgentsFilter } from '#features/agents';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { AgentListView } from './agent-list-view';
import { agentListArgs, emptyCatalog } from './agent-list-view.mocks';

const meta = {
  title: 'Tests/Agents page',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentListView>;

export default meta;

type Story = StoryObj<typeof meta>;

function filtering(width: number): Story {
  return {
    beforeEach: () => settleViewport(width),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Installed' }));
      await expect(
        canvas.getByRole('group', { name: /^Example Agent, v/ }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('group', { name: /^Python Agent, v/ }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Not Installed' }),
      );
      await expect(
        canvas.getByRole('group', { name: /^Python Agent, v/ }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('group', { name: /^Example Agent, v/ }),
      ).not.toBeInTheDocument();
    },
  };
}

export const FiltersWide = filtering(layoutWidths.wide);

export const FiltersPhone = filtering(layoutWidths.phone);

function empty(filter: AgentsFilter, search: string, expected: string): Story {
  return {
    args: {
      installed: [],
      catalog: { status: 'loaded', catalog: emptyCatalog },
      initialFilter: filter,
      initialSearch: search,
    },
    play: async ({ canvas }) => {
      await expect(canvas.getByText(expected)).toBeVisible();
    },
  };
}

export const Empty = empty('all', '', 'No Agents available.');

export const EmptyInstalled = empty('installed', '', 'No installed Agents.');

export const EmptyUninstalled = empty(
  'not-installed',
  '',
  'No uninstalled Agents.',
);

export const SearchEmpty = empty(
  'all',
  'missing',
  'No Agents match your search.',
);

export const SearchEmptyInstalled = empty(
  'installed',
  'missing',
  'No installed Agents match your search.',
);

export const SearchEmptyUninstalled = empty(
  'not-installed',
  'missing',
  'No uninstalled Agents match your search.',
);

export const Retry: Story = {
  args: { catalog: { status: 'failed' } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
