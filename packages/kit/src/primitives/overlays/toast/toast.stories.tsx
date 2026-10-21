import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ActionToastExample, ErrorToastExample } from './toast-example.mocks';

const meta = {
  title: 'Design System/Primitives/Overlays/Toast',
  // A Toast is raised by `showToast`, not drawn from props, so there is nothing to document.
  tags: ['!autodocs'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * `showToast` raises a toast, so each story keeps the button that raises its own.
 * The export cannot be named `Error`, which shadows the global.
 */
export const ErrorToast: Story = {
  name: 'Error',
  render: () => <ErrorToastExample />,
};

// The web only: a toast there can carry one action.
export const WithAction: Story = {
  render: () => <ActionToastExample onUndo={action('undo')} />,
};
