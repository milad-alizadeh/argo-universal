import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { EntryForm, EntryFormActions } from './entry-form';
import { EntryFormField } from './entry-form-field';

const meta = {
  title: 'Design System/Primitives/Scaffolds/EntryForm',
  component: EntryForm,
  parameters: { screenPreview: true },
  args: {
    choice: (
      <Text role="heading" aria-level={2}>
        Details
      </Text>
    ),
    children: (
      <EntryFormField
        title="Address"
        description="Enter an address to continue."
        value="https://example.com"
        onChangeText={fn()}
      />
    ),
    actions: (
      <EntryFormActions>
        <Button label="Continue" onPress={fn()} />
      </EntryFormActions>
    ),
  },
  argTypes: {
    choice: { control: false },
    children: { control: false },
    error: { control: false },
    actions: { control: false },
  },
} satisfies Meta<typeof EntryForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// Desktop keeps the action near the field; native keeps its Form and pinned actions.
export const ShortTask: Story = {};
