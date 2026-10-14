import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { FieldGroup } from '../../fields/field-group/field-group';
import { FieldSection } from '../../fields/field-section/field-section';
import { ListItem } from './list-item';

const onPress = fn<() => void>();

const meta = {
  title: 'Tests/ListItem status',
  component: ListItem,
  args: { title: 'Codex' },
} satisfies Meta<typeof ListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// A value that only says the status: a phone shows the dot alone, and the row's name still says the status.
const statusValue = (
  layout: 'phone' | 'wide',
  labelVisible: boolean,
): Story => ({
  beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
  render: (): React.JSX.Element => (
    <FieldGroup>
      <FieldSection>
        <ListItem
          title="Codex"
          value="Can’t start"
          status={{ tone: 'destructive', label: 'Can’t start' }}
          onPress={onPress}
        />
        <ListItem title="goose" value="Not installed" onPress={onPress} />
      </FieldSection>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Codex, Can’t start' }),
    ).toBeVisible();
    const label = canvas.getByText('Can’t start');
    await (labelVisible
      ? expect(label).toBeVisible()
      : expect(label).not.toBeVisible());
    // A value with no dot is the only sign of its status, so it stays.
    await expect(canvas.getByText('Not installed')).toBeVisible();
  },
});

export const StatusValueIsTheDotOnPhone = statusValue('phone', false);

export const StatusValueKeepsItsLabelOnDesktop = statusValue('wide', true);
