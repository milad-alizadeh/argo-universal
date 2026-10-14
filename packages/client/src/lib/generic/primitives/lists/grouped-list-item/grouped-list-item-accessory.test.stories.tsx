import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { Picker } from '#primitives/inputs/picker';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListItem } from './grouped-list-item';

const efforts = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

type Effort = (typeof efforts)[number]['value'];

const onEffortChange = fn<(effort: Effort) => void>();

function EffortRow(): React.JSX.Element {
  const [effort, setEffort] = useState<Effort>('medium');

  return (
    <GroupedList>
      <GroupedListSection title="Preferences">
        <GroupedListItem
          label="Effort"
          accessory={
            <Picker
              label="Effort"
              value={effort}
              options={efforts}
              onValueChange={(next) => {
                setEffort(next);
                onEffortChange(next);
              }}
            />
          }
        />
      </GroupedListSection>
    </GroupedList>
  );
}

const meta = {
  title: 'Tests/GroupedListItemAccessory',
  render: (): React.JSX.Element => <EffortRow />,
  beforeEach: (): void => {
    onEffortChange.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AccessoryIsReachable: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const row = canvas.getByRole('group', { name: 'Effort' });
    const trigger = within(row).getByRole('button', { name: 'Effort' });
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('option', { name: 'High' }));
    await expect(onEffortChange).toHaveBeenCalledTimes(1);
    await expect(onEffortChange).toHaveBeenCalledWith('high');
  },
};
