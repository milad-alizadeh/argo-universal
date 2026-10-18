import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Variation, Variations as VariationList } from '../../../variations';
import { Alert } from './alert';
import type { AlertProps } from './alert-props';

type AlertContent = Omit<AlertProps, 'open' | 'onOpenChange'>;

const removeTitle = 'Remove Example ACP?';

const removeMessage = 'Sessions that use it keep their history.';

const removeAgent = 'Remove Agent';

const alerts: { state: string; trigger: string; alert: AlertContent }[] = [
  {
    state: 'Destructive confirmation',
    trigger: removeAgent,
    alert: {
      title: removeTitle,
      message: removeMessage,
      actions: [
        { label: removeAgent, tone: 'danger' },
        { label: 'Cancel', cancel: true },
      ],
    },
  },
  {
    state: 'Question',
    trigger: 'Discard changes',
    alert: {
      title: 'Discard your changes?',
      message: 'The Agent keeps its saved launch settings.',
      actions: [{ label: 'Keep editing', cancel: true }, { label: 'Discard' }],
    },
  },
  {
    state: 'Disabled answer',
    trigger: 'Update Agent',
    alert: {
      title: 'Update Example ACP?',
      message: 'Stop its running Sessions before updating it.',
      actions: [
        { label: 'Cancel', cancel: true },
        { label: 'Update', disabled: true },
      ],
    },
  },
  {
    // iOS hides a running alert, since SwiftUI's alert draws no progress; the screen shows it instead.
    state: 'Running answer',
    trigger: 'Removing Agent',
    alert: {
      title: removeTitle,
      message: removeMessage,
      actions: [
        { label: removeAgent, tone: 'danger', loading: true },
        { label: 'Cancel', cancel: true },
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
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

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
