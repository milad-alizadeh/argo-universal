import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentListView } from './agent-list-view';
import {
  agentLink,
  agentListArgs,
  installedAgents,
  longCatalog,
  longCatalogSize,
} from './agent-list-view.mocks';
import { agentsCatalogTestId } from './catalog';

const meta = {
  title: 'Tests/Screens/Settings/Agents long catalog',
  component: AgentListView,
  args: {
    ...agentListArgs(),
    catalog: { status: 'loaded', catalog: longCatalog },
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentListView>;
export default meta;
type Story = StoryObj<typeof meta>;

const firstName = installedAgents[0]?.name;
const lastLongAgent = longCatalog.agents.at(-1)?.entry.name;
if (
  !firstName ||
  !lastLongAgent ||
  longCatalog.agents.length !== longCatalogSize
)
  throw new Error('Recorded catalog needs 200 Agents after an installed one');

export const MountsOnlyTheRowsInViewOfALongCatalog: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('link', { name: agentLink(firstName) }),
    ).toBeVisible();
    await expect(canvas.getAllByRole('link').length).toBeLessThan(
      installedAgents.length + longCatalogSize,
    );
    await expect(
      canvas.queryByRole('link', { name: agentLink(lastLongAgent) }),
    ).not.toBeInTheDocument();
  },
};

export const ScrollsToTheLastAgentOfALongCatalog: Story = {
  play: async ({ canvas }) => {
    const list = await canvas.findByTestId(agentsCatalogTestId);
    const scrollToEnd = (): void => {
      list.scrollTop = list.scrollHeight;
    };
    await waitFor(
      async () => {
        scrollToEnd();
        await expect(
          canvas.getByRole('link', { name: agentLink(lastLongAgent) }),
        ).toBeVisible();
      },
      { timeout: 5000 },
    );
    await expect(
      canvas.queryByRole('link', { name: agentLink(firstName) }),
    ).not.toBeInTheDocument();
  },
};
