import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { Variation, Variations as VariationList } from '../../../variations';
import { BottomSheet } from './bottom-sheet';

const meta = {
  title: 'Design System/Primitives/BottomSheet',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'BottomSheet',
  render: () => (
    <VariationList>
      <Variation label="Fits its content">
        <ExampleSheet fit label="Session options" />
      </Variation>
      <Variation label="Expandable">
        <ExampleSheet expandable initialSize="medium" label="Plan" />
      </Variation>
      <Variation label="With a footer">
        <ExampleSheet fit label="Answer the Agent" footer={<SubmitFooter />} />
      </Variation>
    </VariationList>
  ),
};

type ExampleProps = Pick<
  React.ComponentProps<typeof BottomSheet>,
  'fit' | 'expandable' | 'initialSize' | 'footer'
> & { label: string };

// A button opens the sheet; the sheet holds a heading, a line and one setting.
function ExampleSheet(props: ExampleProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <BottomSheet
      {...props}
      open={open}
      onOpenChange={setOpen}
      trigger={<Button label={props.label} variant="outline" />}
    >
      <SessionOptions />
    </BottomSheet>
  );
}

function SessionOptions(): React.JSX.Element {
  return (
    <View className="gap-3 p-4">
      <Text role="heading" aria-level={2}>
        Session options
      </Text>
      <Text>Choose how this Session runs.</Text>
      <ModeRow />
    </View>
  );
}

function ModeRow(): React.JSX.Element {
  return (
    <View className="flex-row justify-between">
      <Text>Mode</Text>
      <Text role="secondary" tone="muted">
        Default
      </Text>
    </View>
  );
}

function SubmitFooter(): React.JSX.Element {
  return (
    <View className="p-4">
      <Button label="Submit" />
    </View>
  );
}
