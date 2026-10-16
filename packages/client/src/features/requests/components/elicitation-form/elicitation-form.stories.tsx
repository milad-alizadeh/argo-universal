import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import {
  nextWorkRequest,
  nextWorkValues,
} from '../../../../../mocks/elicitation-questions';
import { Variation, Variations } from '../../../../lib/generic/variations';
import {
  configurationRequest,
  configurationValues,
  elicitationProps,
  elicitationMock,
  elicitationMocks,
  elicitationRequest,
  functionNameRequest,
  refactorRequest,
} from '../request.mocks';
import {
  ElicitationForm,
  type ElicitationAnswer,
  type ElicitationFormProps,
} from './elicitation-form';
import { ElicitationOutcome } from './elicitation-outcome';

type GalleryArgs = ComponentProps<typeof ElicitationForm> & {
  agent: (typeof elicitationMock)['agent'];
  requestState: NonNullable<
    ComponentProps<typeof ElicitationForm>['state']
  >['kind'];
};

const meta = {
  title: 'Requests/ElicitationForm',
  component: ElicitationForm,
  parameters: { previewPadding: false },
  args: {
    ...elicitationProps({}),
    agent: elicitationMock.agent,
    requestState: 'open',
  },
  argTypes: {
    agent: { options: ['agent-1', 'agent-2'], control: 'select' },
    requestState: {
      options: ['open', 'submitting', 'answered'],
      control: 'select',
    },
    state: { control: false },
    error: { control: 'text' },
  },
} satisfies Meta<GalleryArgs>;

export default meta;

export const Overview = {
  name: 'ElicitationForm',
  render: (args): React.JSX.Element => <ElicitationGallery {...args} />,
} satisfies StoryObj<GalleryArgs>;

const answeredState = {
  kind: 'answered',
  reason: 'Already answered on another device',
} as const;

const examples: { label: string; props: ElicitationFormProps }[] = [
  {
    label: 'Single choice',
    props: elicitationProps({ request: refactorRequest }),
  },
  {
    label: 'Multiple choice',
    props: elicitationProps({
      request: nextWorkRequest,
      values: nextWorkValues,
    }),
  },
  {
    label: 'Text field',
    props: elicitationProps({ request: functionNameRequest }),
  },
  {
    label: 'Form fields and validation',
    props: elicitationProps({
      request: configurationRequest,
      values: configurationValues,
    }),
  },
];

const outcomes: { label: string; answer: ElicitationAnswer }[] = [
  {
    label: 'Submitted form',
    answer:
      elicitationMock.answer.procedure === 'answerElicitation'
        ? elicitationMock.answer.input
        : { action: 'cancel' },
  },
  { label: 'Dismissed form', answer: { action: 'cancel' } },
  { label: 'Declined form', answer: { action: 'decline' } },
];

function ElicitationGallery(args: GalleryArgs): React.JSX.Element {
  return (
    <View className="w-full items-center py-4">
      <Variations className="max-w-column!">
        <FormVariations {...args} />
        <OutcomeVariations />
        <Variation label="Already answered">
          <ElicitationForm {...elicitationProps({ state: answeredState })} />
        </Variation>
      </Variations>
    </View>
  );
}

function FormVariations(args: GalleryArgs): React.JSX.Element {
  return (
    <>
      <Variation label="Recorded choice">
        <ElicitationForm {...choiceProps(args)} />
      </Variation>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <ElicitationForm {...props} />
        </Variation>
      ))}
    </>
  );
}

function choiceProps(args: GalleryArgs): ElicitationFormProps {
  const selected = elicitationProps({
    mock:
      elicitationMocks.find((mock) => mock.agent === args.agent) ??
      elicitationMock,
  });

  return elicitationProps({
    ...args,
    request: selected.request,
    state:
      args.requestState === 'answered'
        ? answeredState
        : { kind: args.requestState },
  });
}

function OutcomeVariations(): React.JSX.Element {
  return (
    <>
      {outcomes.map(({ label, answer }) => (
        <Variation key={label} label={label}>
          <ElicitationOutcome request={elicitationRequest} answer={answer} />
        </Variation>
      ))}
    </>
  );
}
