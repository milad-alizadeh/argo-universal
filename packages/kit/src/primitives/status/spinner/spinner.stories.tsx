import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Spinner } from './spinner';
import { loadingSpinner } from './spinner-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/Spinner',
  component: Spinner,
  argTypes: kitArgTypes('Spinner'),
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: loadingSpinner };
