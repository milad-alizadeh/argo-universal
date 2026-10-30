import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { type AgentsFilter, agentsPage } from '#features/agents';
import { AgentListView } from './agent-list-view';
import {
  agentListArgs,
  catalog,
  emptyCatalog,
  longCatalog,
  pageRows,
} from './agent-list-view.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agents',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentListView>;

export default meta;

type Story = StoryObj<typeof meta>;

function filtering(width: number): Story {
  return {
    beforeEach: () => settleLayout(width),
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

function searching(width: number): Story {
  return {
    beforeEach: () => settleLayout(width),
    play: async ({ canvas, userEvent }) => {
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
}

export const SearchesWide = searching(layoutWidths.wide);

export const SearchesPhone = searching(layoutWidths.phone);

function empty(filter: AgentsFilter, search: string, expected: RegExp): Story {
  return {
    args: {
      agents: pageRows([], { status: 'loaded', registry: emptyCatalog }),
      initialFilter: filter,
      initialSearch: search,
    },
    play: async ({ canvas }) => {
      await expect(canvas.getByText(expected)).toBeVisible();
    },
  };
}

export const Empty = empty('all', '', /available/);

export const EmptyInstalled = empty('installed', '', /No installed/);

export const EmptyUninstalled = empty('not-installed', '', /No uninstalled/);

export const SearchEmpty = empty('all', 'missing', /No Agents match/);

export const SearchEmptyInstalled = empty(
  'installed',
  'missing',
  /No installed Agents match/,
);

export const SearchEmptyUninstalled = empty(
  'not-installed',
  'missing',
  /No uninstalled Agents match/,
);

// Until the Server says which Agents are installed, the page is a busy status with no card to press.
export const WaitsForInstalledAgents: Story = {
  args: {
    agents: agentsPage(
      { status: 'loading' },
      { status: 'loaded', registry: catalog },
    ),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(canvas.queryByRole('button', { name: /Install/ })).toBeNull();
  },
};

export const NamesInstalledAgentsFailure: Story = {
  args: {
    agents: agentsPage(
      { status: 'failed' },
      { status: 'loaded', registry: catalog },
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Failed/)).toBeVisible();
  },
};

export const Retry: Story = {
  args: { agents: pageRows(undefined, { status: 'failed' }) },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

// The last Agent must fit inside the window when the catalog is scrolled to its end.
export const CatalogEndReachable: Story = {
  beforeEach: () => settleLayout('wide'),
  args: { agents: pageRows([], { status: 'loaded', registry: longCatalog }) },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('agents-catalog');
    scroll.scrollTop = scroll.scrollHeight;
    const last = await canvas.findByRole('group', { name: /^Agent 199, v/ });
    await waitFor(() =>
      expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight,
      ),
    );
  },
};
