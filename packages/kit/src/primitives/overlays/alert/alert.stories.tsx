import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { Alert } from './alert';
import type { AlertProps } from './alert-props';

const removeTitle = 'Delete item?';

const removeMessage = 'This cannot be undone.';

const removeAgent = 'Delete';

/*
 * An alert only draws while it is open, so each story opens its own from a trigger; the open state
 * belongs to the preview and the args hold the question the alert asks.
 */
const meta = {
  title: 'Design System/Primitives/Overlays/Alert',
  component: Alert,
  args: {
    open: false,
    onOpenChange: (): void => {},
    title: removeTitle,
    message: removeMessage,
  },
  argTypes: kitArgTypes('Alert'),
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DestructiveConfirmation: Story = {
  args: {
    actions: [
      { label: removeAgent, tone: 'danger' },
      { label: 'Cancel', role: 'cancel' },
    ],
  },
  render: (args): React.JSX.Element => (
    <AlertPreview trigger={removeAgent} alert={args} />
  ),
};

export const Question: Story = {
  args: {
    title: 'Discard your changes?',
    message: 'Saved settings stay as they are.',
    actions: [{ label: 'Keep editing', role: 'cancel' }, { label: 'Discard' }],
  },
  render: (args): React.JSX.Element => (
    <AlertPreview trigger="Discard changes" alert={args} />
  ),
};

export const DisabledAnswer: Story = {
  args: {
    title: 'Update item?',
    message: 'Stop running work before updating.',
    actions: [
      { label: 'Cancel', role: 'cancel' },
      { label: 'Update', disabled: true },
    ],
  },
  render: (args): React.JSX.Element => (
    <AlertPreview trigger="Update" alert={args} />
  ),
};

// iOS hides a running alert, since SwiftUI's alert draws no progress; the screen shows it instead.
export const RunningAnswer: Story = {
  args: {
    actions: [
      { label: removeAgent, tone: 'danger', loading: true },
      { label: 'Cancel', role: 'cancel' },
    ],
  },
  render: (args): React.JSX.Element => (
    <AlertPreview trigger="Deleting" alert={args} />
  ),
};

type AlertPreviewProps = { trigger: string; alert: AlertProps };

function AlertPreview(props: AlertPreviewProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-row">
      <Button
        label={props.trigger}
        variant="outline"
        onPress={() => setOpen(true)}
      />
      <Alert {...props.alert} open={open} onOpenChange={setOpen} />
    </View>
  );
}
