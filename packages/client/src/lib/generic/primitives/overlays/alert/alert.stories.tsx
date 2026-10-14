import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Button } from '../../buttons/button/button';
import { Alert } from './alert';
import type { AlertProps } from './alert-props';

type AlertContent = Omit<AlertProps, 'open' | 'onOpenChange'>;

const alerts: { state: string; trigger: string; alert: AlertContent }[] = [
  {
    state: 'Destructive confirmation',
    trigger: 'Remove Agent',
    alert: {
      title: 'Remove Example ACP?',
      message: 'Sessions that use it keep their history.',
      actions: [
        { label: 'Remove Agent', role: 'destructive' },
        { label: 'Cancel', role: 'cancel' },
      ],
    },
  },
  {
    state: 'Question',
    trigger: 'Discard changes',
    alert: {
      title: 'Discard your changes?',
      message: 'The Agent keeps its saved launch settings.',
      actions: [
        { label: 'Keep editing', role: 'cancel' },
        { label: 'Discard' },
      ],
    },
  },
  {
    state: 'Question with a command',
    trigger: 'Install Node.js',
    alert: {
      title: 'Install Node.js?',
      message:
        'Codex runs with npx, which needs Node.js. Argo runs this with Homebrew on Milad’s Mac mini:',
      command: 'brew install node',
      actions: [{ label: 'Cancel', role: 'cancel' }, { label: 'Install' }],
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

const meta = { title: 'Design System/Primitives/Alert' } satisfies Meta;

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
