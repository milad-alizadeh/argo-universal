import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  ElicitationFormPreview,
  elicitationMock,
  elicitationMocks,
  elicitationRequest,
  fieldsRequest,
  fieldsValues,
} from '../../mocks/request-preview';
import { ElicitationOutcome } from './ElicitationOutcome';

type GalleryArgs = ComponentProps<typeof ElicitationFormPreview> & {
  agent: (typeof elicitationMock)['agent'];
  requestState: NonNullable<
    ComponentProps<typeof ElicitationFormPreview>['state']
  >['kind'];
};

const meta = {
  title: 'Sessions/ElicitationForm',
  component: ElicitationFormPreview,
  parameters: { previewPadding: false },
  args: { agent: elicitationMock.agent, requestState: 'open' },
  argTypes: {
    agent: { options: ['agent-1', 'agent-2'], control: 'select' },
    requestState: {
      options: ['open', 'submitting', 'answered'],
      control: 'select',
    },
    mock: { control: false },
    state: { control: false },
    error: { control: 'text' },
  },
} satisfies Meta<GalleryArgs>;
export default meta;

export const Overview: StoryObj<GalleryArgs> = {
  name: 'ElicitationForm',
  render: (args) => (
    <View className="w-full items-center py-4">
      <Variations className="max-w-composer!">
        <Variation label="Choice">
          <ElicitationFormPreview
            {...args}
            mock={
              elicitationMocks.find((mock) => mock.agent === args.agent) ??
              elicitationMock
            }
            state={
              args.requestState === 'answered'
                ? {
                    kind: 'answered',
                    reason: 'Already answered on another device',
                  }
                : { kind: args.requestState }
            }
          />
        </Variation>
        <Variation label="Form fields and validation">
          <ElicitationFormPreview
            request={fieldsRequest}
            values={fieldsValues}
            source="linear"
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
          <ElicitationFormPreview
            state={{
              kind: 'answered',
              reason: 'Already answered on another device',
            }}
          />
        </Variation>
      </Variations>
    </View>
  ),
};
