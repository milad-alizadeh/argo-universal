import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { DatePicker } from './date-picker';
import type { DatePickerProps } from './date-picker-props';

const meta = {
  title: 'Design System/Primitives/Inputs/DatePicker',
  component: DatePicker,
  argTypes: kitArgTypes('DatePicker'),
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Variations: Story = {
  name: 'DatePicker',
  render: () => <DatePickerVariations />,
};

type ExampleProps = Omit<DatePickerProps, 'onValueChange'>;

function Example(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return <DatePicker {...props} value={value} onValueChange={setValue} />;
}

const examples: { title: string; props: ExampleProps }[] = [
  { title: 'Date', props: { label: 'Due date', value: '2026-10-19' } },
  {
    title: 'Time',
    props: { label: 'Reminder', mode: 'time', value: '14:30' },
  },
  {
    title: 'Date and time',
    props: { label: 'Due', mode: 'datetime', value: '2026-10-19T14:30' },
  },
  { title: 'Empty', props: { label: 'Due date' } },
  {
    title: 'Disabled',
    props: { label: 'Due date', value: '2026-10-19', disabled: true },
  },
  {
    title: 'Invalid',
    props: {
      label: 'Due date',
      value: '2026-10-18',
      errors: [{ message: 'Pick today or a later date.' }],
    },
  },
];

function DatePickerVariations(): React.JSX.Element {
  return (
    <List appearance="grouped">
      {examples.map(({ title, props }) => (
        <ListSection key={title} title={title}>
          <Example {...props} />
        </ListSection>
      ))}
    </List>
  );
}
