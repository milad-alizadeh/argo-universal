import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { ElicitationForm } from './elicitation-form';
import {
  answeredElicitation,
  choiceFieldsElicitation,
  formFieldsElicitation,
  multipleChoiceElicitation,
  severalQuestionsElicitation,
  singleChoiceElicitation,
  submittingElicitation,
  textFieldElicitation,
} from './elicitation-form-fixtures';

// The request as a card, in a Feed's request frame.
const meta = {
  title: 'Requests/ElicitationForm',
  component: ElicitationForm,
  parameters: { previewPadding: false },
  decorators: [
    (Story): React.JSX.Element => (
      <RequestFrame>
        <Story />
      </RequestFrame>
    ),
  ],
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
      description: 'The answers the form opens with.',
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
  args: { ...singleChoiceElicitation, onAnswer: action('answer') },
} satisfies Meta<typeof ElicitationForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// Choices with nothing else to check page one question at a time.
export const SingleChoice: Story = { args: singleChoiceElicitation };

export const MultipleChoice: Story = { args: multipleChoiceElicitation };

// Several questions: each takes its own page, headed by its title and the pager.
export const SeveralQuestions: Story = { args: severalQuestionsElicitation };

// Any other form is one page of fields, headed by its message.
export const TextField: Story = { args: textFieldElicitation };

export const FormFields: Story = { args: formFieldsElicitation };

export const ChoiceFields: Story = { args: choiceFieldsElicitation };

export const Submitting: Story = { args: submittingElicitation };

export const AlreadyAnswered: Story = { args: answeredElicitation };
