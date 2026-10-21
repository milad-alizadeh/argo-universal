import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useId, useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Variation, Variations } from '../../../variations';
import { Portal, PortalHost } from './portal';

const meta = {
  title: 'Design System/Primitives/Overlays/Portal',
  component: Portal,
  render: (): React.JSX.Element => <PortalPreview />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'Portal' };

function PortalPreview(): React.JSX.Element {
  const hostName = useId();
  const [open, setOpen] = useState(true);

  return (
    <PortalExample
      hostName={hostName}
      open={open}
      onToggle={() => setOpen(!open)}
    />
  );
}

type ExampleProps = { hostName: string; open: boolean; onToggle: () => void };

function PortalExample(props: ExampleProps): React.JSX.Element {
  const portal = portalContent(props);

  return (
    <NamedHost hostName={props.hostName}>
      <Button {...buttonProps(props)} />
      {portal}
    </NamedHost>
  );
}

function NamedHost(props: {
  hostName: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Variations>
      <Variation label="Named region">
        <View className="relative w-full min-h-32 rounded-sheet bg-card p-4">
          <PortalHost name={props.hostName} />
        </View>
        {props.children}
      </Variation>
    </Variations>
  );
}

function buttonProps(props: ExampleProps): React.ComponentProps<typeof Button> {
  return {
    label: props.open ? 'Collapse plan' : 'Expand plan',
    onPress: props.onToggle,
  };
}

function portalContent(props: ExampleProps): React.ReactNode {
  if (!props.open) return null;

  return (
    <Portal name="preview" hostName={props.hostName}>
      <Text role="body">Expanded plan</Text>
    </Portal>
  );
}
