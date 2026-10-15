import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../../../../lib/generic/variations';
import {
  elicitationProps,
  elicitationMock,
  elicitationMocks,
  elicitationRequest,
  fieldsRequest,
  fieldsValues,
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

const fieldsProps = elicitationProps({
  request: fieldsRequest,
  values: fieldsValues,
  source: 'linear',
});

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
      <Variation label="Choice">
        <ElicitationForm {...choiceProps(args)} />
      </Variation>
      <Variation label="Form fields and validation">
        <ElicitationForm {...fieldsProps} />
      </Variation>
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
