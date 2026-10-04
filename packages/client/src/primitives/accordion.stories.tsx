import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  StorySections,
  Variation,
  Variations,
} from '../../mocks/primitive-story-variations';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';
import { Text } from './text';

function AccordionExample({
  type = 'single',
  disabled = false,
}: {
  type?: 'single' | 'multiple';
  disabled?: boolean;
}) {
  const items = [
    [
      'item-1',
      'Product Information',
      'Our flagship product combines cutting-edge technology with sleek design.',
    ],
    [
      'item-2',
      'Shipping Details',
      'Standard delivery takes 3–5 business days.',
    ],
    [
      'item-3',
      'Return Policy',
      'Return the item in its original condition within 30 days.',
    ],
  ] as const;
  const children = items.map(([value, title, description]) => (
    <AccordionItem key={value} value={value}>
      <AccordionTrigger>
        <Text>{title}</Text>
      </AccordionTrigger>
      <AccordionContent>
        <Text>{description}</Text>
      </AccordionContent>
    </AccordionItem>
  ));
  return type === 'single' ? (
    <Accordion
      type="single"
      collapsible
      disabled={disabled}
      defaultValue="item-1"
    >
      {children}
    </Accordion>
  ) : (
    <Accordion type="multiple" disabled={disabled} defaultValue={['item-1']}>
      {children}
    </Accordion>
  );
}
function TypeExamples() {
  return (
    <Variations>
      {(['single', 'multiple'] as const).map((type) => (
        <Variation key={type} label={type}>
          <AccordionExample type={type} />
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
          <AccordionExample disabled={disabled} />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Design System/Primitives/Accordion',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StorySections
      sections={{ Type: TypeExamples, Disabled: DisabledExamples }}
    />
  ),
};
export const Type: Story = { render: TypeExamples };
export const Disabled: Story = { render: DisabledExamples };
