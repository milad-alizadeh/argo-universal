import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { ComposerDetailView } from './composer-detail-view';
import { suggestionModels } from './composer-detail-view-fixtures';

const onSuggestionModelChange = fn();

const meta = {
  title: 'Tests/Screens/Settings/Composer',
  component: ComposerDetailView,
  args: {
    followUpSuggestions: true,
    suggestionModels,
    onFollowUpSuggestionsChange: fn(),
    onSuggestionModelChange,
  },
  render: (args): React.JSX.Element => (
    <View className="h-175 w-full">
      <ComposerDetailView {...args} />
    </View>
  ),
  beforeEach: (): void => {
    onSuggestionModelChange.mockClear();
  },
} satisfies Meta<typeof ComposerDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

function required<Value>(value: Value | undefined, what: string): Value {
  if (value === undefined) throw new Error(`Recorded catalog needs ${what}`);

  return value;
}

const recorded = suggestionModels;

const first = required(recorded[0], 'a first Agent');

const second = required(recorded[1], 'a second Agent');

const model = required(second.models.at(-1), 'a model on the second Agent');

const agents = [first, second];

const agentRow = (
  canvas: PlayContext['canvas'],
  name: string,
): HTMLElement | null =>
  canvas.queryByRole('button', { name: new RegExp(`^${name}`) });

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

// Opens the second Agent's picker, a select at every width, and returns the row of its last model once it can be pressed.
async function openPicker({
  canvas,
  canvasElement,
}: PlayContext): Promise<HTMLElement> {
  await page
    .elementLocator(
      canvas.getByRole('button', { name: new RegExp(`^${second.name}`) }),
    )
    .click();
  const body = within(canvasElement.ownerDocument.body);
  const row = await body.findByRole('option', { name: model.name });
  await settleOverlays();
  await expect(
    body.getByRole('option', { name: 'Same as Session' }),
  ).toBeVisible();
  // Check the first option before scrolling the last model into view.
  row.scrollIntoView({ block: 'nearest' });
  await settleOverlays(row);

  return row;
}

// One row per Installed Agent under the toggle; choosing one of the Agent's models reports it, opening no page.
const choosesAModel = (width: number): Story => ({
  play: async (context) => {
    await settleLayout(width);

    for (const agent of agents)
      await expect(agentRow(context.canvas, agent.name)).toBeVisible();

    await page.elementLocator(await openPicker(context)).click();
    await expect(onSuggestionModelChange).toHaveBeenLastCalledWith(second.id, {
      type: 'model',
      value: model.value,
    });
  },
});

export const ChoosesAModelPhone = choosesAModel(layoutWidths.phone);

export const ChoosesAModelWide = choosesAModel(layoutWidths.wide);

// With no Installed Agents answered yet, the page keeps only its toggle.
export const NoAgentsYet: Story = {
  args: { suggestionModels: undefined },
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByText('Follow-up suggestions')).toBeVisible();

    for (const agent of agents)
      await expect(agentRow(canvas, agent.name)).toBeNull();
  },
};
