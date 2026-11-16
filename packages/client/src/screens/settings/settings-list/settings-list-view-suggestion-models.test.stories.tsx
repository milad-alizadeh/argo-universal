import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { SettingsListView } from './settings-list-view';
import { readySettings } from './settings-list-view-fixtures';

const onSuggestionModelChange = fn();

const meta = {
  title: 'Tests/Screens/Settings/SuggestionModels',
  component: SettingsListView,
  args: {
    ...readySettings,
    onSelect: fn(),
    onThemeChange: fn(),
    onFollowUpSuggestionsChange: fn(),
    onSuggestionModelChange,
  },
  render: (args): React.JSX.Element => (
    <View className="h-175 w-full">
      <SettingsListView {...args} />
    </View>
  ),
  beforeEach: (): void => {
    onSuggestionModelChange.mockClear();
  },
} satisfies Meta<typeof SettingsListView>;

export default meta;

type Story = StoryObj<typeof meta>;

function required<Value>(value: Value | undefined, what: string): Value {
  if (value === undefined) throw new Error(`Recorded catalog needs ${what}`);

  return value;
}

const recorded = readySettings.suggestionModels ?? [];

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
  userEvent,
}: PlayContext): Promise<HTMLElement> {
  await userEvent.click(
    canvas.getByRole('button', { name: new RegExp(`^${second.name}`) }),
  );
  const body = within(canvasElement.ownerDocument.body);
  const row = await body.findByRole('option', { name: model.name });
  // The last model can sit below the fold of the phone-width popup, where nobody can point at it and settleOverlays would wait for ever.
  row.scrollIntoView({ block: 'nearest' });
  // The popup fades in, and toBeVisible reads its opacity, so assert only once the entrance has ended.
  await settleOverlays(row);
  await expect(
    body.getByRole('option', { name: 'Same as Session' }),
  ).toBeVisible();

  return row;
}

// One row per Installed Agent under the toggle; choosing one of the Agent's models reports it, opening no page.
const choosesAModel = (width: number): Story => ({
  play: async (context) => {
    await settleLayout(width);

    for (const agent of agents)
      await expect(agentRow(context.canvas, agent.name)).toBeVisible();

    await context.userEvent.click(await openPicker(context));
    await expect(onSuggestionModelChange).toHaveBeenLastCalledWith(second.id, {
      type: 'model',
      value: model.value,
    });
    await expect(context.args.onSelect).not.toHaveBeenCalled();
  },
});

export const ChoosesAModelPhone = choosesAModel(layoutWidths.phone);

export const ChoosesAModelWide = choosesAModel(layoutWidths.wide);

// With no Installed Agents answered yet, the Composer group keeps only its toggle.
export const NoAgentsYet: Story = {
  args: { suggestionModels: undefined },
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByText('Follow-up suggestions')).toBeVisible();

    for (const agent of agents)
      await expect(agentRow(canvas, agent.name)).toBeNull();
  },
};
