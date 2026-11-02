import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ProjectNewView } from './project-new-view';

const meta = {
  title: 'Screens/Settings/ProjectNewView',
  component: ProjectNewView,
  parameters: { screenPreview: true },
  args: {
    onSubmit: fn(),
    onCancel: fn(),
    onChooseFolder: fn(async () => '/Users/you/Developer/argo-universal'),
  },
  argTypes: {
    adding: { control: 'boolean' },
    error: { control: 'text' },
    onSubmit: { control: false },
    onCancel: { control: false },
    onChooseFolder: { control: false },
  },
} satisfies Meta<typeof ProjectNewView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The desktop page starts with the native folder chooser.
export const AsksForAFolder: Story = {};

// The Server is adding the Project; its controls cannot be pressed again.
export const Adding: Story = { args: { adding: true } };

// A Server failure stays beside the form, which can be tried again.
export const Failed: Story = {
  args: { error: 'The selected folder is not inside a git repository.' },
};
