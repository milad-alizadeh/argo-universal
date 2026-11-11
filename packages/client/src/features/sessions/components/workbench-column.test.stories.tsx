import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { WorkbenchColumn } from './workbench-column';
import { oneCard, threeCards } from './workbench-column-fixtures';

const meta = {
  title: 'Tests/Sessions/WorkbenchColumn',
  component: WorkbenchColumn,
  decorators: [
    (Story): ReactElement => (
      <View className="m-4 w-frame-list">
        <Story />
      </View>
    ),
  ],
  args: { cards: threeCards },
} satisfies Meta<typeof WorkbenchColumn>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

type Canvas = PlayContext['canvas'];

const pressLeft = '[MouseLeft>]';

const releaseLeft = '[/MouseLeft]';

const titles = (canvas: Canvas): (string | null)[] =>
  canvas.getAllByRole('heading').map((heading) => heading.textContent);

export const DraggingAHandlePlacesTheCard: Story = {
  play: async ({ canvas, userEvent }) => {
    const handle = canvas.getByRole('button', { name: 'Reorder First' });
    const grip = handle.getBoundingClientRect();
    const last = canvas.getByRole('heading', { name: 'Third' });

    await expect(titles(canvas)).toEqual(['First', 'Second', 'Third']);
    await userEvent.pointer([
      {
        target: handle,
        coords: { clientX: grip.x + 4, clientY: grip.y + 4 },
        keys: pressLeft,
      },
      {
        target: handle,
        coords: {
          clientX: grip.x + 4,
          clientY: last.getBoundingClientRect().bottom + 40,
        },
      },
      { keys: releaseLeft },
    ]);
    await waitFor(() =>
      expect(titles(canvas)).toEqual(['Second', 'Third', 'First']),
    );
  },
};

async function pressOnHandle(
  { canvas, userEvent }: PlayContext,
  name: string,
  key: string,
): Promise<void> {
  canvas.getByRole('button', { name: `Reorder ${name}` }).focus();
  await userEvent.keyboard(key);
}

export const ArrowUpMovesAFocusedCardUp: Story = {
  play: async (context) => {
    const { canvas } = context;

    await pressOnHandle(context, 'Third', '{ArrowUp}');
    await waitFor(() =>
      expect(titles(canvas)).toEqual(['First', 'Third', 'Second']),
    );
  },
};

export const ArrowDownMovesAFocusedCardDown: Story = {
  play: async (context) => {
    const { canvas } = context;

    await pressOnHandle(context, 'First', '{ArrowDown}');
    await waitFor(() =>
      expect(titles(canvas)).toEqual(['Second', 'First', 'Third']),
    );
  },
};

export const ArrowUpOnTheFirstCardKeepsItThere: Story = {
  play: async (context) => {
    const { canvas } = context;

    await pressOnHandle(context, 'First', '{ArrowUp}');
    await expect(titles(canvas)).toEqual(['First', 'Second', 'Third']);
  },
};

export const ACardCollapsesBesideTheOthers: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Collapse Second' }),
    );
    await waitFor(() =>
      expect(canvas.queryByText('A body', { exact: false })).toBeNull(),
    );
    await expect(canvas.getByText('One line.')).toBeVisible();
    await expect(canvas.getByText('Another body.')).toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: /^Reorder / }),
    ).toHaveLength(3);
  },
};

const handleOf = (canvas: Canvas, name: string): HTMLElement =>
  canvas.getByRole('button', { name: `Reorder ${name}` });

export const AHandleIsHiddenAtRest: Story = {
  play: async ({ canvas }) => {
    await expect(handleOf(canvas, 'First')).not.toBeVisible();
  },
};

export const HoveringACardShowsItsHandleOnly: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByText('One line.'));
    await waitFor(() => expect(handleOf(canvas, 'First')).toBeVisible());
    await expect(handleOf(canvas, 'Second')).not.toBeVisible();
  },
};

export const LeavingACardHidesItsHandle: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByText('One line.'));
    await waitFor(() => expect(handleOf(canvas, 'First')).toBeVisible());
    await userEvent.unhover(canvas.getByText('One line.'));
    await waitFor(() => expect(handleOf(canvas, 'First')).not.toBeVisible());
  },
};

export const FocusingAHandleShowsIt: Story = {
  play: async ({ canvas }) => {
    handleOf(canvas, 'Third').focus();
    await waitFor(() => expect(handleOf(canvas, 'Third')).toBeVisible());
  },
};

export const PressingAHandleThenLeavingHidesIt: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByText('One line.'));
    await userEvent.click(handleOf(canvas, 'First'));
    await userEvent.unhover(canvas.getByText('One line.'));
    await waitFor(() => expect(handleOf(canvas, 'First')).not.toBeVisible());
  },
};

// A touch is not a hover: the same enter, from a finger, shows no grip.
export const ATouchOverACardShowsNoHandle: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByText('One line.');

    for (const type of ['pointerover', 'pointerenter']) {
      card.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'touch',
          bubbles: type === 'pointerover',
        }),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(handleOf(canvas, 'First')).not.toBeVisible();
  },
};

// While a card is held, only its grip shows, wherever the pointer passes.
export const HoveringAnotherCardWhileDraggingShowsOnlyTheHeldGrip: Story = {
  play: async ({ canvas, userEvent }) => {
    const grip = handleOf(canvas, 'First');

    await userEvent.hover(canvas.getByText('One line.'));
    await waitFor(() => expect(grip).toBeVisible());
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: grip },
      {
        target: canvas.getByText(
          'A body of two lines, so the cards differ in height.',
        ),
      },
    ]);
    await expect(grip).toBeVisible();
    await expect(handleOf(canvas, 'Second')).not.toBeVisible();
    await userEvent.pointer({ keys: '[/MouseLeft]' });
  },
};

export const ALoneCardHasNoHandle: Story = {
  args: { cards: oneCard },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'First' })).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: /^Reorder / }),
    ).toBeNull();
  },
};
