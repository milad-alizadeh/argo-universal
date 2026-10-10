import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import {
  elicitationProps,
  elicitationMock,
  elicitationMocks,
  elicitationRequest,
  fieldsRequest,
  fieldsValues,
} from '../../../mocks/request-mock';
import { Variation, Variations } from '../../../storybook/variations';
import { ElicitationForm } from './elicitation-form';
import { ElicitationOutcome } from './elicitation-outcome';

type GalleryArgs = ComponentProps<typeof ElicitationForm> & {
  agent: (typeof elicitationMock)['agent'];
  requestState: NonNullable<
    ComponentProps<typeof ElicitationForm>['state']
  >['kind'];
};

const meta = {
  title: 'Sessions/ElicitationForm',
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
  render: (args): React.JSX.Element => {
    const selected = elicitationProps({
      mock:
        elicitationMocks.find((mock) => mock.agent === args.agent) ??
        elicitationMock,
    });
    return (
      <View className="w-full items-center py-4">
        <Variations className="max-w-composer!">
          <Variation label="Choice">
            <ElicitationForm
              {...elicitationProps({
                ...args,
                request: selected.request,
                state:
                  args.requestState === 'answered'
                    ? {
                        kind: 'answered',
                        reason: 'Already answered on another device',
                      }
                    : { kind: args.requestState },
              })}
            />
          </Variation>
          <Variation label="Form fields and validation">
            <ElicitationForm
              {...elicitationProps({
                request: fieldsRequest,
                values: fieldsValues,
                source: 'linear',
              })}
            />
          </Variation>
          <Variation label="Submitted form">
            <ElicitationOutcome
              request={elicitationRequest}
              answer={
                elicitationMock.answer.procedure === 'answerElicitation'
                  ? elicitationMock.answer.input
                  : { action: 'cancel' }
              }
            />
          </Variation>
          <Variation label="Dismissed form">
            <ElicitationOutcome
              request={elicitationRequest}
              answer={{ action: 'cancel' }}
            />
          </Variation>
          <Variation label="Declined form">
            <ElicitationOutcome
              request={elicitationRequest}
              answer={{ action: 'decline' }}
            />
          </Variation>
          <Variation label="Already answered">
            <ElicitationForm
              {...elicitationProps({
                state: {
                  kind: 'answered',
                  reason: 'Already answered on another device',
                },
              })}
            />
          </Variation>
        </Variations>
      </View>
    );
  },
} satisfies StoryObj<GalleryArgs>;
