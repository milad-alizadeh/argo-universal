import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useId, useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Portal, PortalHost } from './portal';

// Portal is a children-only wrapper from @gorhom/portal, so there is nothing for a Control or a props table to carry.
const meta = {
  title: 'Design System/Primitives/Overlays/Portal',
  component: Portal,
  tags: ['!autodocs'],
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

// Content declared beside the button, drawn in the named region above it.
export const NamedRegion: Story = {
  render: (): React.JSX.Element => <PortalPreview />,
};

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
    <>
      <View className="relative w-full min-h-32 rounded-sheet bg-card p-4">
        <PortalHost name={props.hostName} />
      </View>
      {props.children}
    </>
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
