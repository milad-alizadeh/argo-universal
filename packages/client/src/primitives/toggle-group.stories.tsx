import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Bold, Italic, Underline } from 'lucide-react-native';
import { useState } from 'react';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
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
    ['bold', Bold],
    ['italic', Italic],
    ['underline', Underline],
  ] as const;
  const props = {
    variant,
    size,
    disabled,
    children: items.map(([value, icon]) => (
      <ToggleGroupItem key={value} value={value} accessibilityLabel={value}>
        <ToggleGroupIcon as={icon} />
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
function TypeExamples() {
  return (
    <Variations>
      {(['single', 'multiple'] as const).map((type) => (
        <Variation key={type} label={type}>
          <ToggleGroupExample type={type} />
        </Variation>
      ))}
    </Variations>
  );
}
function VariantExamples() {
  return (
    <Variations>
      {(['default', 'outline'] as const).map((variant) => (
        <Variation key={variant} label={variant}>
          <ToggleGroupExample variant={variant} />
        </Variation>
      ))}
    </Variations>
  );
}
function SizeExamples() {
  return (
    <Variations>
      {(['default', 'sm', 'lg'] as const).map((size) => (
        <Variation key={size} label={size}>
          <ToggleGroupExample size={size} />
        </Variation>
      ))}
    </Variations>
  );
}
function DisabledExamples() {
  return (
    <Variations>
      {[false, true].map((disabled) => (
        <Variation key={String(disabled)} label={String(disabled)}>
          <ToggleGroupExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Toggle Group',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{
        Type: TypeExamples,
        Variant: VariantExamples,
        Size: SizeExamples,
        Disabled: DisabledExamples,
      }}
    />
  ),
};
export const Type: Story = { render: TypeExamples };
export const Variant: Story = { render: VariantExamples };
export const Size: Story = { render: SizeExamples };
export const Disabled: Story = { render: DisabledExamples };
