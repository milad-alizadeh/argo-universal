import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { expect, screen, within } from 'storybook/test';
import { useSessionPanels } from '#features/sessions';
import { pluginCardKey } from './sections/plugin-card-section';
import {
  coverageCard,
  coverageCardSummary,
} from './sections/plugin-card.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { panelsSession } from './session-detail-view-panels.test.mocks';
import { emptySession } from './session-detail-view.mocks';

const desktopWithInspector = 1920;

const meta = {
  title: 'Tests/Screens/Sessions/Session/Panels',
  parameters: { screenPreview: true },
  args: { view: panelsSession },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleLayout(desktopWithInspector),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const firstTitle = 'Find every Feed reader';

const selected = ['aria-selected', 'true'] as const;

const subagentsName = { name: 'Agents' };

const subagentsTab = { name: 'Agents: 4' };

const changesName = { name: 'Changes' };

const changesEntry = { name: 'Open Changes overview' };

const subagentsEntry = { name: `Open ${firstTitle}` };

async function openBoth({ canvas, userEvent }: Context): Promise<void> {
  await userEvent.click(await canvas.findByRole('button', changesEntry));
  await userEvent.click(canvas.getByRole('button', subagentsEntry));
  await expect(
    await within(canvas.getByRole('tabpanel', subagentsName)).findByText(
      firstTitle,
    ),
  ).toBeVisible();
}

// The Workbench card focuses an existing tab and restores its content without adding another tab.
export const FocusExistingTab: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(canvas.getByRole('tab', changesName));
    await expect(
      canvas.queryByRole('tabpanel', subagentsName),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('tabpanel', changesName)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', subagentsEntry));
    await expect(canvas.getAllByRole('tab', subagentsTab)).toHaveLength(1);
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );
    await expect(
      within(canvas.getByRole('tabpanel', subagentsName)).getByText(firstTitle),
    ).toBeVisible();
  },
};

// Expanding a Session's tabbed Inspector keeps its current panel selected.
export const ExpandSelectedPanel: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Restore Inspector' }),
    ).toBeVisible();
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );
  },
};

// Closing one tab returns to the remaining panel; closing the last removes the Inspector.
export const CloseTabs: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(canvas.getByRole('button', { name: 'Close Agents' }));
    await expect(
      canvas.queryByRole('tab', subagentsTab),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('tab', changesName)).toHaveAttribute(
      ...selected,
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Changes' }),
    );
    await expect(canvas.queryByRole('tab')).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Show Inspector' }),
    ).toHaveAttribute('aria-pressed', 'false');
  },
};

// Closing the Inspector closes every tab, so the next opening starts with that panel alone.
export const CloseInspector: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Hide Inspector' }),
    );
    await expect(canvas.queryByRole('tab')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', subagentsEntry));
    await expect(canvas.getAllByRole('tab')).toHaveLength(1);
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );
  },
};

// A card without a full view stays in the Workbench; the band's Inspector action cannot open it as a tab.
export const CardWithoutFullViewDoesNotOpenInspector: Story = {
  args: {
    view: { state: 'open', ...emptySession, pluginCards: [coverageCard] },
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText(coverageCardSummary)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show Inspector' }),
    );
    await expect(
      canvas.queryByRole('tab', { name: 'Coverage' }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Changes' })).toBeVisible();
  },
};

// A connected Session supplies remembered panels independently of the view's layout.
function RememberedCardSession(): JSX.Element {
  const key = pluginCardKey(coverageCard.pluginId, coverageCard.card.id);
  const panels = useSessionPanels([key]);
  const [seeded, setSeeded] = useState(false);

  if (!seeded) {
    panels.select(key);
    setSeeded(true);
  }

  return (
    <FramedSessionPreview
      state="open"
      {...emptySession}
      pluginCards={[coverageCard]}
      inspectorPanels={panels}
    />
  );
}

export const RememberedCardHasNoWideTab: Story = {
  render: () => <RememberedCardSession />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(coverageCardSummary)).toBeVisible();
    await expect(
      canvas.queryByRole('tab', { name: 'Coverage' }),
    ).not.toBeInTheDocument();
  },
};

export const RememberedCardOpensPhoneSheet: Story = {
  render: () => <RememberedCardSession />,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async () => {
    await expect(await screen.findByText(coverageCardSummary)).toBeVisible();
  },
};
