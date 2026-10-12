import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { FieldGroup } from '../../fields/field-group/field-group';
import { FieldSection } from '../../fields/field-section/field-section';
import { SelectMenu } from '../../inputs/select-menu/select-menu';
import { ListItem } from './list-item';

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
    <FieldGroup>
      <FieldSection title="Preferences">
        <ListItem
          title="Effort"
          accessory={
            <SelectMenu
              accessibilityLabel="Effort"
              value={effort}
              options={efforts}
              onValueChange={(next) => {
                setEffort(next);
                onEffortChange(next);
              }}
            />
          }
        />
      </FieldSection>
    </FieldGroup>
  );
}

const meta = {
  title: 'Tests/ListItemAccessory',
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
