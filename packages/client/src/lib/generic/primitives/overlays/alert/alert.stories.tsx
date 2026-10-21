import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { Variation, Variations as VariationList } from '../../../variations';
import { Alert } from './alert';
import type { AlertProps } from './alert-props';

type AlertContent = Omit<AlertProps, 'open' | 'onOpenChange'>;

const removeTitle = 'Delete item?';

const removeMessage = 'This cannot be undone.';

const removeAgent = 'Delete';

const alerts: { state: string; trigger: string; alert: AlertContent }[] = [
  {
    state: 'Destructive confirmation',
    trigger: removeAgent,
    alert: {
      title: removeTitle,
      message: removeMessage,
      actions: [
        { label: removeAgent, tone: 'danger' },
        { label: 'Cancel', role: 'cancel' },
      ],
    },
  },
  {
    state: 'Question',
    trigger: 'Discard changes',
    alert: {
      title: 'Discard your changes?',
      message: 'Saved settings stay as they are.',
      actions: [
        { label: 'Keep editing', role: 'cancel' },
        { label: 'Discard' },
      ],
    },
  },
  {
    state: 'Disabled answer',
    trigger: 'Update',
    alert: {
      title: 'Update item?',
      message: 'Stop running work before updating.',
      actions: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Update', disabled: true },
      ],
    },
  },
  {
    // iOS hides a running alert, since SwiftUI's alert draws no progress; the screen shows it instead.
    state: 'Running answer',
    trigger: 'Deleting',
    alert: {
      title: removeTitle,
      message: removeMessage,
      actions: [
        { label: removeAgent, tone: 'danger', loading: true },
        { label: 'Cancel', role: 'cancel' },
      ],
    },
  },
];

type AlertPreviewProps = { trigger: string; alert: AlertContent };

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

const meta = {
  title: 'Design System/Primitives/Overlays/Alert',
  component: Alert,
  argTypes: kitArgTypes('Alert'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Variations: Story = {
  name: 'Alert',
  render: () => (
    <VariationList>
      {alerts.map(({ state, trigger, alert }) => (
        <Variation key={state} label={state}>
          <AlertPreview trigger={trigger} alert={alert} />
        </Variation>
      ))}
    </VariationList>
  ),
};
