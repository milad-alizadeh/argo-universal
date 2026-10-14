import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Button } from '#primitives/buttons/button';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListContent } from './grouped-list-content';

const meta = {
  title: 'Design System/Primitives/GroupedListContent',
  args: { children: null },
  component: GroupedListContent,
  parameters: { screenPreview: true },
} satisfies Meta<typeof GroupedListContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <GroupedList>
      <GroupedListSection title="Program">
        <GroupedListItem label="Name" value="Example ACP" />
      </GroupedListSection>
      <GroupedListContent>
        <Button fullWidth="narrow" label="Save" onPress={action('save')} />
      </GroupedListContent>
    </GroupedList>
  ),
};
