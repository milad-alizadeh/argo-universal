import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Button } from '#primitives/buttons/button/button';
import {
  elicitationProps,
  fieldsRequest,
  fieldsValues,
} from '../request.mocks';
import type { ElicitationFormProps } from './elicitation-form';
import { ElicitationSheet } from './elicitation-sheet';

const sheetRequest = {
  ...fieldsRequest,
  requestedSchema: {
    ...fieldsRequest.requestedSchema,
    properties: {
      ...fieldsRequest.requestedSchema.properties,
      team: {
        type: 'string',
        title: 'Team',
        enum: [
          'Mobile',
          'Desktop',
          'Platform',
          'Infrastructure',
          'Design',
          'QA',
          'Security',
          'Data',
        ],
      },
    },
  },
} satisfies ElicitationFormProps['request'];

const meta = {
  title: 'Requests/ElicitationSheet',
  component: ElicitationSheet,
  parameters: { screenPreview: true },
  args: elicitationProps({
    request: sheetRequest,
    values: { ...fieldsValues, estimate: '5' },
    source: 'linear',
  }),
  render: (args): ReactElement => <InteractiveSheet {...args} />,
} satisfies Meta<typeof ElicitationSheet>;

export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'ElicitationSheet' };

function InteractiveSheet(props: ElicitationFormProps): ReactElement {
  const [open, setOpen] = useState(true);

  const onAnswer: ElicitationFormProps['onAnswer'] = (answer) => {
    props.onAnswer(answer);
    setOpen(false);
  };

  return open ? (
    <ElicitationSheet {...props} onAnswer={onAnswer} />
  ) : (
    <Button label="Open form" onPress={() => setOpen(true)} />
  );
}
