import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  ElicitationFormPreview,
  elicitationMock,
  elicitationRequest,
  fieldsRequest,
  fieldsValues,
} from '../../mocks/request-preview';
import { ElicitationOutcome } from './ElicitationOutcome';

const meta = {
  title: 'Sessions/ElicitationForm',
  component: ElicitationFormPreview,
  parameters: { previewPadding: false },
} satisfies Meta<typeof ElicitationFormPreview>;
export default meta;

export const Overview: StoryObj<typeof meta> = {
  name: 'ElicitationForm',
  render: () => (
    <View className="w-full items-center py-4">
      <Variations className="max-w-composer!">
        <Variation label="Choice">
          <ElicitationFormPreview />
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
          <ElicitationFormPreview alreadyAnswered="Already answered on another device" />
        </Variation>
      </Variations>
    </View>
  ),
};
