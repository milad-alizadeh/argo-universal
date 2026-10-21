import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { action } from 'storybook/actions';
import type { ElicitationFormProps } from './elicitation-form';
import {
  formFieldsElicitation,
  multipleChoiceElicitation,
  severalQuestionsElicitation,
  singleChoiceElicitation,
  textFieldElicitation,
} from './elicitation-form-fixtures';
import { ElicitationSheet } from './elicitation-sheet';

// The same request over a Session: the wide Composer's tray, or a sheet on a phone or a narrow window.
const meta = {
  title: 'Requests/ElicitationSheet',
  component: ElicitationSheet,
  parameters: { screenPreview: true },
  /*
   * ElicitationFormProps is declared in elicitation-form-props.ts, which react-docgen cannot
   * follow (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    request: {
      control: false,
      description: 'The pending Elicitation and the schema it asks for.',
    },
    initialValues: {
      control: false,
      description: 'The answers the sheet opens with.',
    },
    state: {
      control: false,
      description: 'Open, submitting, or answered with the reason.',
    },
    source: {
      control: 'text',
      description: 'Which Tool asked, when the Agent says.',
    },
    error: { control: 'text' },
    onAnswer: { control: false },
  },
  args: { ...severalQuestionsElicitation, onAnswer: action('answer') },
  render: (args): ReactElement => <InteractiveSheet {...args} />,
} satisfies Meta<typeof ElicitationSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// Several questions: the sheet pages through them one at a time.
export const SeveralQuestions: Story = { args: severalQuestionsElicitation };

export const SingleChoice: Story = { args: singleChoiceElicitation };

export const MultipleChoice: Story = { args: multipleChoiceElicitation };

// Any other form is one page of fields, headed by its message.
export const TextField: Story = { args: textFieldElicitation };

export const FormFields: Story = { args: formFieldsElicitation };

// Answering closes the sheet, as it does over a Session.
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
