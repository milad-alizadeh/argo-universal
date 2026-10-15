import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { Variation, Variations as VariationList } from '../../../variations';
import { Alert } from './alert';
import type { AlertProps } from './alert-props';

const removalTitle = 'Remove this Agent from Argo?';

const removalMessage = 'Its installed files stay on this computer.';

const removeAgent = 'Remove Agent';

const removeLabel = 'Remove';

type AlertContent = Omit<AlertProps, 'open' | 'onOpenChange'>;

const alerts: { state: string; trigger: string; alert: AlertContent }[] = [
  {
    state: 'Destructive confirmation',
    trigger: removeAgent,
    alert: {
      title: removalTitle,
      message: removalMessage,
      actions: [
        { label: removeLabel, tone: 'danger' },
        { label: 'Cancel', cancel: true },
      ],
    },
  },
  {
    state: 'Disabled answer',
    trigger: 'Remove in use Agent',
    alert: {
      title: removalTitle,
      message: removalMessage,
      actions: [
        { label: removeLabel, tone: 'danger', disabled: true },
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
];

type AlertPreviewProps = {
  trigger: string;
  alert: AlertContent;
  // The alert's answer is running, so it stays up.
  busy?: boolean;
};

function AlertPreview(props: AlertPreviewProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const show = (): void => setOpen(true);

  return (
    <View className="flex-row">
      <Button label={props.trigger} variant="outline" onPress={show} />
      <Alert
        {...props.alert}
        open={open || !!props.busy}
        onOpenChange={setOpen}
      />
    </View>
  );
}

const removalTime = 2000;

// Remove runs for a moment: the alert shows progress and takes no answer until it finishes.
type Removal = { removing: boolean; remove: () => void };

function useRemoval(): Removal {
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!removing) return;
    const timer = setTimeout(() => setRemoving(false), removalTime);

    return (): void => clearTimeout(timer);
  }, [removing]);

  return { removing, remove: () => setRemoving(true) };
}

function RunningAlertPreview(): React.JSX.Element {
  const { removing, remove } = useRemoval();

  return (
    <AlertPreview
      trigger={removeAgent}
      alert={runningAlert(removing, remove)}
      busy={removing}
    />
  );
}

function runningAlert(removing: boolean, remove: () => void): AlertContent {
  return {
    title: removalTitle,
    message: removalMessage,
    actions: [
      { label: 'Cancel', cancel: true },
      {
        label: removing ? 'Removing…' : removeLabel,
        tone: 'danger',
        loading: removing,
        onPress: remove,
      },
    ],
  };
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
      <Variation label="Running answer">
        <RunningAlertPreview />
      </Variation>
    </VariationList>
  ),
};
