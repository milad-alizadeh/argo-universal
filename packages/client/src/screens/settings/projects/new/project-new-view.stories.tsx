import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ProjectNewView } from './project-new-view';

const meta = {
  title: 'Screens/Settings/ProjectNewView',
  component: ProjectNewView,
  parameters: { screenPreview: true },
  args: { onSubmit: fn() },
  argTypes: { adding: { control: 'boolean' }, onSubmit: { control: false } },
} satisfies Meta<typeof ProjectNewView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The page opens on a folder already on the Server; clone and new are the other two ways in.
export const AsksForAFolder: Story = {};

// The Server is adding the Project: the form keeps what was typed and Add cannot be pressed again.
export const Adding: Story = { args: { adding: true } };
