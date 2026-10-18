import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Button } from '#primitives/actions/button';
import {
  nextWorkRequest,
  nextWorkValues,
  questionsRequest,
} from '../../../../../mocks/elicitation-questions';
import {
  configurationRequest,
  elicitationProps,
  functionNameRequest,
  refactorRequest,
} from '../request.mocks';
import type { ElicitationFormProps } from './elicitation-form';
import { ElicitationSheet } from './elicitation-sheet';

const meta = {
  title: 'Requests/ElicitationSheet',
  component: ElicitationSheet,
  parameters: { screenPreview: true },
  args: elicitationProps({ request: questionsRequest }),
  render: (args): ReactElement => <InteractiveSheet {...args} />,
} satisfies Meta<typeof ElicitationSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'ElicitationSheet' };

export const MultipleChoice: Story = {
  args: { request: nextWorkRequest, initialValues: nextWorkValues },
};

export const SingleChoice: Story = { args: { request: refactorRequest } };

export const TextField: Story = {
  args: { request: functionNameRequest },
};

export const FormFields: Story = {
  args: {
    request: configurationRequest,
    initialValues: { name: 'argo-server' },
  },
};

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
