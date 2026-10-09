import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { ToggleGroup, ToggleGroupIcon, ToggleGroupItem } from './toggle-group';

function ToggleGroupExample({
  type = 'single',
  variant = 'default',
  size = 'default',
  disabled = false,
}: {
  type?: 'single' | 'multiple';
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
}) {
  const [single, setSingle] = useState<string | undefined>('bold');
  const [multiple, setMultiple] = useState<string[]>(['bold']);
  const items = [
    ['bold', 'bold'],
    ['italic', 'italic'],
    ['underline', 'underline'],
  ] as const;
  const props = {
    variant,
    size,
    disabled,
    children: items.map(([value, icon]) => (
      <ToggleGroupItem key={value} value={value} accessibilityLabel={value}>
        <ToggleGroupIcon name={icon} />
      </ToggleGroupItem>
    )),
  };
  return type === 'single' ? (
    <ToggleGroup
      type="single"
      value={single}
      onValueChange={setSingle}
      {...props}
    />
  ) : (
    <ToggleGroup
      type="multiple"
      value={multiple}
      onValueChange={setMultiple}
      {...props}
    />
  );
}

const meta = {
  title: 'Design System/Primitives/Toggle Group',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Toggle Group',
  render: () => (
    <Variations>
      <Variation label="Single selection">
        <ToggleGroupExample type="single" />
      </Variation>
      <Variation label="Multiple selection">
        <ToggleGroupExample type="multiple" />
      </Variation>
      <Variation label="Outline">
        <ToggleGroupExample variant="outline" />
      </Variation>
      <Variation label="Small">
        <ToggleGroupExample size="sm" />
      </Variation>
      <Variation label="Large">
        <ToggleGroupExample size="lg" />
      </Variation>
      <Variation label="Disabled">
        <ToggleGroupExample disabled />
      </Variation>
    </Variations>
  ),
};
